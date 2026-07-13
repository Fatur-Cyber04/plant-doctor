# 🌿 Plant Doctor — Deteksi Penyakit Tanaman Berbasis AI

Proyek UAS Artificial Intelligence: web app untuk mendeteksi penyakit tanaman dari foto daun/ranting menggunakan **Computer Vision (image classification)**, lengkap dengan katalog perawatan & rekomendasi obat, serta fitur pencarian manual.

## Cara Kerja Sistem

1. User upload foto atau ambil foto langsung dari kamera lewat browser.
2. Foto dikirim ke backend (Node.js/Express).
3. Backend meneruskan foto ke **Hugging Face Inference API**, memanggil model pretrained
   `linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification` (MobileNetV2, dilatih di dataset **PlantVillage**, 38 kelas tanaman & penyakit).
4. Label hasil prediksi (mis. `Tomato___Late_blight`) dicocokkan ke **database MySQL** (tabel `diseases`) yang berisi nama Indonesia, gejala, cara merawat, dan rekomendasi obat.
5. Hasil ditampilkan ke user dalam bentuk kartu diagnosis.

Ini memenuhi ketentuan tugas: teknologi AI yang dipakai = **Computer Vision / Image Classification** (bukan sekadar CRUD) + **database MySQL** sungguhan.

---

## Struktur Folder

```
plant-doctor/
├── server.js              # Backend Express (API deteksi + search, query ke MySQL)
├── package.json
├── .env.example            # Contoh konfigurasi token AI + koneksi database
├── database/
│   └── schema.sql           # Skema tabel + 38 data seed, tinggal import ke phpMyAdmin
├── data/
│   └── diseases.json       # Data mentah (sumber asli sebelum dikonversi ke SQL, untuk referensi)
└── public/
    └── index.html           # Frontend (upload, kamera, katalog, search)
```

---

## Langkah 1 — Siapkan Database di XAMPP

### 1.1. Nyalakan Apache & MySQL di XAMPP Control Panel
Klik **Start** pada baris **Apache** dan **MySQL** (seperti di screenshot kamu — kalau sudah hijau/running, lanjut).

### 1.2. Buka phpMyAdmin
Buka browser ke `http://localhost/phpmyadmin`.

### 1.3. Import `database/schema.sql`
1. Di phpMyAdmin, klik tab **Import** di menu atas.
2. Klik **Choose File**, pilih file `database/schema.sql` dari folder proyek ini.
3. Klik **Go** di bagian bawah.
4. Ini otomatis akan: membuat database `plant_doctor`, membuat tabel `diseases`, dan mengisi 38 baris data penyakit.
5. Cek hasilnya: klik database `plant_doctor` di sidebar kiri → tabel `diseases` → tab **Browse**, harus muncul 38 baris.

> **Kalau MySQL kamu punya password root** (bukan default XAMPP yang kosong), catat passwordnya untuk langkah 2.4 di bawah.

---

## Langkah 2 — Jalankan Backend di Komputer Sendiri (Lokal)

### 2.1. Install Node.js
Download & install dari https://nodejs.org (pilih versi LTS). Cek dengan:
```bash
node -v
npm -v
```
> Node.js ini terpisah dari XAMPP — XAMPP menjalankan Apache+MySQL (dipakai untuk phpMyAdmin & databasenya saja), sedangkan Node.js yang menjalankan aplikasi Plant Doctor-nya. Apache di XAMPP **tidak perlu** dipakai untuk serve aplikasi ini.

### 2.2. Install dependency
Buka terminal/CMD di folder proyek ini:
```bash
npm install
```

### 2.3. Dapatkan token AI gratis dari Hugging Face
Model AI-nya dipanggil lewat Hugging Face Inference API, **gratis** tapi butuh token akun:
1. Daftar akun gratis di https://huggingface.co/join
2. Buka https://huggingface.co/settings/tokens
3. Klik **New Token** → beri nama bebas → role pilih **Read** → Generate
4. Copy token yang muncul (diawali `hf_...`)

### 2.4. Buat file `.env`
Copy `.env.example` menjadi `.env`, lalu isi:
```
HF_TOKEN=hf_tokenkamu...

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=plant_doctor
```
`DB_USER=root` dan `DB_PASSWORD=` (kosong) adalah default bawaan XAMPP. Kalau MySQL kamu sudah diberi password lewat phpMyAdmin (menu User Accounts), isi `DB_PASSWORD` sesuai itu.

### 2.5. Jalankan server
```bash
npm start
```
Kalau berhasil, di terminal akan muncul:
```
✅ Terhubung ke database MySQL (plant_doctor)
Plant Doctor server berjalan di http://localhost:3000
```
Buka browser ke `http://localhost:3000` — web sudah bisa dipakai, dan datanya sekarang beneran diambil dari MySQL/XAMPP kamu.

**Kalau muncul `❌ Gagal terhubung ke database MySQL`:**
- Pastikan MySQL di XAMPP Control Panel statusnya running (hijau).
- Cek ulang `DB_USER`/`DB_PASSWORD` di `.env` sudah sesuai dengan setting MySQL kamu.
- Pastikan database `plant_doctor` sudah di-import (Langkah 1.3).

> **Catatan cold start AI**: permintaan pertama ke model AI kadang butuh 20-30 detik karena model "dibangunkan" oleh Hugging Face (gratis tapi ada trade-off ini). Coba lagi kalau muncul pesan model sedang loading.

---

## Langkah 3 — Push ke GitHub (untuk dikumpulkan)

```bash
git init
git add .
git commit -m "Plant Doctor - UAS AI"
git branch -M main
git remote add origin https://github.com/USERNAME/plant-doctor.git
git push -u origin main
```
File `.env` **tidak akan ikut ter-push** (sudah diblokir lewat `.gitignore`) — ini penting supaya token kamu tidak bocor ke publik.

---

## Langkah 4 — Hosting Gratis (Render.com + Database Cloud)

> **Penting**: MySQL XAMPP di komputer kamu cuma bisa diakses dari komputer itu sendiri (`localhost`). Begitu aplikasi di-hosting online, ia butuh database yang juga online. Jadi untuk versi hosting, database perlu dipindah ke **MySQL cloud gratis** — bukan XAMPP lagi. XAMPP tetap dipakai untuk development/demo di laptop kamu.

### 4.1. Buat database MySQL gratis di cloud
Pilih salah satu (semua ada tier gratis):
- **Aiven** (https://aiven.io) — free plan MySQL, paling stabil untuk tugas kuliah.
- **FreeSQLDatabase** (https://www.freesqldatabase.com) — gratis, simpel, tanpa kartu kredit.
- **Railway** (https://railway.app) — punya database MySQL/PostgreSQL dengan trial credit gratis.

Setelah dibuat, kamu akan dapat kredensial: host, port, username, password, nama database.

### 4.2. Import `database/schema.sql` ke database cloud tadi
Gunakan phpMyAdmin yang disediakan platform tersebut (Aiven & FreeSQLDatabase biasanya sudah include), atau lewat tool seperti **MySQL Workbench** / **TablePlus**: connect pakai kredensial cloud, lalu jalankan isi `database/schema.sql`.

### 4.3. Deploy backend ke Render
1. Buat akun gratis di https://render.com (bisa langsung pakai akun GitHub).
2. Klik **New +** → **Web Service**.
3. Hubungkan ke repository GitHub `plant-doctor` yang tadi kamu push.
4. Isi konfigurasi:
   - **Name**: `plant-doctor` (bebas)
   - **Region**: Singapore (paling dekat ke Indonesia)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Di bagian **Environment Variables**, tambahkan semuanya:
   - `HF_TOKEN` → token Hugging Face kamu
   - `DB_HOST` → host dari database cloud (Langkah 4.1)
   - `DB_PORT` → port dari database cloud
   - `DB_USER` → username dari database cloud
   - `DB_PASSWORD` → password dari database cloud
   - `DB_NAME` → nama database (mis. `plant_doctor`)
6. Klik **Create Web Service**. Tunggu proses build (~2-3 menit).
7. Setelah selesai, Render akan kasih URL publik seperti:
   `https://plant-doctor-xxxx.onrender.com`
   URL inilah yang kamu pakai untuk demo & dicantumkan di poster (via QR Code).

> **Catatan free tier Render**: server akan "tidur" otomatis setelah ±15 menit tanpa aktivitas, dan butuh sekitar 30-50 detik untuk "bangun" lagi saat diakses pertama kali. Ini normal untuk paket gratis — pastikan buka link beberapa menit sebelum presentasi/demo supaya server sudah aktif.

### Alternatif hosting gratis lain
- **Railway.app** — mirip Render, sekaligus bisa host database & backend di satu tempat.
- **Cyclic / Fly.io** — alternatif Node.js hosting gratis.
- **Vercel** — cocok kalau frontend & backend dipisah (frontend statis di Vercel, backend di Render).

---

## Langkah 5 — Isi QR Code untuk Poster

Setelah dapat URL dari Render, generate QR Code gratis di https://www.qr-code-generator.com atau https://qr.io, masukkan URL websitenya, lalu tempel QR Code itu di poster/X-banner kamu.

---

## Menambah / Mengedit Data Penyakit

Sekarang datanya ada di tabel `diseases` pada database MySQL. Cara edit paling gampang: buka **phpMyAdmin** (`http://localhost/phpmyadmin`) → database `plant_doctor` → tabel `diseases` → tab **Browse** untuk lihat data, atau tab **Insert** untuk nambah baris baru, atau klik **Edit** di baris yang mau diubah.

Kolom yang ada:
```
label               -> harus SAMA PERSIS dengan nama kelas yang dikeluarkan model AI
tanaman             -> nama tanaman dalam Bahasa Indonesia (mis. "Tomat")
penyakit            -> nama penyakit dalam Bahasa Indonesia
status              -> "sehat" atau "sakit"
deskripsi           -> penjelasan singkat penyakitnya
gejala               -> ciri-ciri yang terlihat di daun
perawatan            -> langkah perawatan/pencegahan
rekomendasi_obat    -> fungisida/bakterisida/insektisida yang disarankan
tingkat_keparahan   -> ringan / sedang / tinggi / sangat tinggi / "tidak ada" (untuk yang sehat)
```
Field `label` harus sama persis dengan nama kelas dari model AI (lihat daftar 38 kelas di dokumentasi model: https://huggingface.co/linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification). Kalau mau tambah tanaman baru yang tidak ada di 38 kelas ini, kamu perlu latih ulang/ganti model (lihat bagian di bawah) — menambah baris di database saja tidak cukup kalau model AI-nya tidak pernah dilatih mengenali kelas itu.

File `data/diseases.json` masih disimpan di repo sebagai draf/sumber data mentah sebelum dikonversi ke SQL (`database/schema.sql` dibuat dari file ini) — tidak dipakai lagi oleh aplikasi saat runtime.

---

## Opsional: Melatih Model Sendiri (kalau mau nilai plus di "Implementasi AI")

Kalau ingin menunjukkan proses training sendiri (bukan cuma pakai model pretrained orang lain), cara termudah dan **gratis** tanpa coding rumit:

1. Buka **Google Teachable Machine**: https://teachablemachine.withgoogle.com/train/image
2. Buat beberapa kelas, misalnya "Tomat Sehat", "Tomat Late Blight", "Tomat Early Blight".
3. Upload contoh foto per kelas (bisa ambil dari dataset PlantVillage di Kaggle: https://www.kaggle.com/datasets/emmarex/plantdisease — gratis, tinggal download).
4. Klik **Train Model** (diproses langsung di browser, gratis, tanpa GPU).
5. Export model sebagai **TensorFlow.js**.
6. Model hasil training bisa dipakai langsung di frontend tanpa backend sama sekali (inference di browser). Tunjukkan ini di laporan/presentasi sebagai bukti proses training mandiri, sambil tetap memakai model pretrained Hugging Face untuk cakupan 38 kelas yang lebih luas di aplikasi utama.

---

## Reset Database (kalau data kacau / mau ulang dari awal)

Buka phpMyAdmin → tab **SQL** pada database `plant_doctor` → jalankan ulang isi file `database/schema.sql` (ada `DROP TABLE IF EXISTS diseases` di dalamnya, jadi aman dijalankan berkali-kali — tabel akan dibuat ulang dan diisi 38 data awal lagi).

---

## Checklist untuk Pengumpulan Tugas

- [x] **Implementasi AI**: Computer Vision (image classification, MobileNetV2 di dataset PlantVillage)
- [x] **Bukan CRUD semata**: fitur utama adalah prediksi AI, CRUD (search) hanya fitur pendukung
- [ ] **GitHub Repository** — push kode ke akun GitHub kamu (Langkah 3)
- [ ] **Video Demo YouTube (3-5 menit)** — rekam layar sambil: (1) jelaskan masalah, (2) upload/foto daun sakit, (3) tunjukkan hasil diagnosis, (4) tunjukkan fitur search
- [ ] **Poster/X-Banner** — cantumkan nama app "Plant Doctor", deskripsi singkat, fitur utama, dan QR Code ke link Render kamu
- [ ] **Presentasi** — siapkan alur: masalah petani sulit identifikasi penyakit tanaman → solusi AI → demo langsung → hasil pengujian akurasi model

---

## Batasan (untuk disebutkan saat presentasi/tanya jawab)

- Model hanya mengenali 38 kelas dari dataset PlantVillage (didominasi tanaman buah/sayur negara empat musim); tetap mencakup tomat, kentang, jagung, cabai/paprika yang relevan untuk pertanian Indonesia.
- Akurasi bergantung pada kualitas foto (pencahayaan, fokus, satu daun per foto).
- Bukan pengganti diagnosis ahli pertanian/PHT — untuk kasus serius disarankan konsultasi penyuluh pertanian.
