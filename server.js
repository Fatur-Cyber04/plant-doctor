require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// HF_TOKEN diambil dari environment variable (jangan taruh langsung di kode!)
const HF_TOKEN = process.env.HF_TOKEN || '';
const HF_MODEL = 'linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// simpan file upload sementara di memori (bukan disimpan ke disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // maks 8MB
});

// --- KONEKSI DATABASE MySQL (XAMPP) ---
// Default XAMPP: host=localhost, user=root, password kosong, port 3306
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'plant_doctor',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// cek koneksi database saat server start
async function checkDbConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Terhubung ke database MySQL (plant_doctor)');
  } catch (err) {
    console.error('❌ Gagal terhubung ke database MySQL:', err.message);
    console.error('   Pastikan XAMPP (Apache + MySQL) sudah running, dan database "plant_doctor" sudah di-import dari database/schema.sql');
  }
}
checkDbConnection();

// helper: normalisasi string label supaya "Tomato with Early Blight" bisa dicocokkan
// dengan "Tomato___Early_blight" walau formatnya beda (huruf besar/kecil, underscore, kata "with", dll)
function normalizeLabel(str) {
  return String(str)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\bwith\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// helper: cari entri database berdasarkan label mentah dari model AI
async function findByLabel(rawLabel) {
  const target = normalizeLabel(rawLabel);

  // 1) coba exact match dulu (paling cepat & akurat)
  const [exact] = await pool.query('SELECT * FROM diseases WHERE label = ? LIMIT 1', [rawLabel]);
  if (exact[0]) return exact[0];

  // 2) kalau tidak ada exact match, ambil semua & cocokkan versi ternormalisasi
  const [all] = await pool.query('SELECT * FROM diseases');
  let best = null;
  let bestScore = 0;
  for (const row of all) {
    const candidate = normalizeLabel(row.label);
    if (candidate === target) return row; // cocok persis setelah dinormalisasi

    // fallback skor: hitung berapa banyak kata yang sama di antara keduanya
    const targetWords = new Set(target.split(' '));
    const candidateWords = candidate.split(' ');
    const overlap = candidateWords.filter(w => targetWords.has(w)).length;
    const score = overlap / Math.max(candidateWords.length, targetWords.size);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  // hanya terima hasil fallback kalau kecocokannya cukup tinggi (>=60% kata sama)
  return bestScore >= 0.6 ? best : null;
}

// --- ENDPOINT 1: Deteksi penyakit dari foto ---
app.post('/api/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada gambar yang dikirim.' });
    }
    if (!HF_TOKEN) {
      return res.status(500).json({
        error: 'Server belum dikonfigurasi. HF_TOKEN belum diset di environment variable.'
      });
    }

    // kirim gambar ke Hugging Face Inference API
    // Catatan: alamat lama "api-inference.huggingface.co" sudah dimatikan oleh Hugging Face
    // per pertengahan 2026, diganti ke "router.huggingface.co/hf-inference"
    const hfResponse = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': req.file.mimetype
        },
        body: req.file.buffer
      }
    );

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      // model kadang perlu "warm up" (cold start) 20-30 detik pada permintaan pertama
      if (hfResponse.status === 503) {
        return res.status(503).json({
          error: 'Model AI sedang memuat (cold start). Coba lagi dalam 20-30 detik.'
        });
      }
      return res.status(502).json({ error: 'Gagal menghubungi model AI.', detail: errText });
    }

    const predictions = await hfResponse.json();
    // predictions: [{ label: 'Tomato___Late_blight', score: 0.87 }, ...]
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return res.status(502).json({ error: 'Model AI tidak mengembalikan hasil yang valid.' });
    }

    predictions.sort((a, b) => b.score - a.score);
    const top = predictions[0];
    const info = await findByLabel(top.label);

    return res.json({
      prediksi_mentah: top.label,
      confidence: top.score,
      top3: predictions.slice(0, 3),
      info: info || {
        tanaman: 'Tidak diketahui',
        penyakit: top.label,
        deskripsi: 'Detail penyakit ini belum ada di database.',
        gejala: '-',
        perawatan: '-',
        rekomendasi_obat: '-',
        tingkat_keparahan: '-',
        status: 'sakit'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.', detail: err.message });
  }
});

// --- ENDPOINT 2: Ambil semua data penyakit (untuk katalog) ---
app.get('/api/diseases', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM diseases ORDER BY tanaman, penyakit');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data dari database.', detail: err.message });
  }
});

// --- ENDPOINT 3: Cari penyakit/tanaman secara manual ---
app.get('/api/diseases/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      const [rows] = await pool.query('SELECT * FROM diseases ORDER BY tanaman, penyakit');
      return res.json(rows);
    }
    const like = `%${q}%`;
    const [rows] = await pool.query(
      'SELECT * FROM diseases WHERE tanaman LIKE ? OR penyakit LIKE ? OR deskripsi LIKE ? ORDER BY tanaman, penyakit',
      [like, like, like]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mencari data.', detail: err.message });
  }
});

// health check (berguna untuk platform hosting)
app.get('/api/health', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', detail: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Plant Doctor server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;