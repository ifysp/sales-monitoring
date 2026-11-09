# SWIT Monitoring — Beyond Medical

Sistem pencatatan customer, Purchase Order, kontrak, dan pembayaran untuk produk **Tricefy** dan **Viewpoint 6**, beserta catatan teknis (special configuration & error history). Dipakai internal divisi Product Specialist SWIT.

**Stack:** Next.js 16 · TypeScript · Prisma 7 · PostgreSQL · Tailwind CSS

---

## 1. Persiapan (sekali saja)

Pastikan sudah ter-install di laptop:

- **Node.js** versi 20 atau lebih baru → cek: `node -v`
- **PostgreSQL** + **pgAdmin**, dan sudah ada database bernama **`monitoring`**

## 2. Setup project

Ekstrak zip, buka foldernya di VS Code, lalu buka terminal (`Ctrl + ~`):

```powershell
# 1) Install semua library (otomatis juga menjalankan "prisma generate")
npm install

# 2) Buat file .env dari contoh, lalu edit password PostgreSQL di dalamnya
copy .env.example .env
```

Buka `.env` dan ganti `PASSWORD_ANDA` dengan password PostgreSQL Anda.

## 3. Isi database — pilih SALAH SATU cara

**Cara A (disarankan) — lewat Prisma:**

```powershell
npx prisma migrate deploy   # membuat semua tabel
npx prisma db seed          # mengisi akun, produk, package, tahapan, model mesin
```

**Cara B — import file SQL lewat pgAdmin:**

1. Pastikan database `monitoring` masih **kosong** (belum ada tabel).
2. Klik kanan database `monitoring` → **Query Tool**.
3. Buka file `database/monitoring.sql` → klik **Execute (F5)**.

> Kalau database `monitoring` Anda sudah berisi tabel `customers` dari latihan sebelumnya, hapus dulu tabel itu
> (atau hapus & buat ulang database `monitoring`) sebelum menjalankan Cara A atau B.

**Opsional — data demo** untuk mencoba / presentasi (3 customer, 3 PO, 1 site, semua berlabel `[DEMO]`):

```powershell
npm run seed:demo
```

## 4. Jalankan aplikasi

```powershell
npm run dev
```

Buka **http://localhost:3000** dan login:

| Akun | Email | Password awal | Role |
| --- | --- | --- | --- |
| Lead SWIT | `lead@swit.local` | `Admin12345` | Admin |
| Minnie | `minnie@swit.local` | `User12345` | User |

**Segera ganti password** lewat menu nama Anda (kiri bawah) → Ganti password. Nama & email bisa diubah Admin di **Master Data → Pengguna**.

---

## Fitur

| Menu | Isi |
| --- | --- |
| **Dashboard** | PO berjalan per tahap, reminder cicilan (≤ 30 hari & terlambat), kontrak yang akan berakhir (≤ 90 hari), progress bar semua PO |
| **Customer** | Data RS/klinik/dokter, daftar PO dan site milik customer |
| **Purchase Order** | Satu PO bisa berisi Tricefy **dan** Viewpoint. Progress bar PO masuk → Berita acara → Aktivasi → Tukar faktur → Payment → Clear. Cicilan dipecah per segmen sampai 100%. Lampiran PDF/JPG/PNG maks. 10 MB |
| **Site & Teknis** | Site ID, PC & spek, aplikasi, special configuration (integrasi, preferensi dokter, quick report, jurnal & grafik), error history + lampiran |
| **Laporan** | Laporan bulanan (PO masuk + pembayaran diterima), **Export Excel** untuk finance |
| **Master Data** *(Admin)* | Package, tahapan, model mesin, pengguna — bisa diubah tanpa mengubah kode |
| **Audit Log** *(Admin)* | Siapa mengubah apa dan kapan |

**Hak akses:** Admin (Lead SWIT) bisa mengatur jadwal cicilan, master data, dan menghapus customer/PO/site. Setiap penghapusan harus mengetik `HAPUS`. Customer & PO memakai *soft delete* (data tidak benar-benar hilang dari database).

---

## Struktur folder

```
app/
  (app)/            halaman setelah login (dashboard, customers, orders, sites, reports, master, audit, account)
  actions/          server actions = "backend": simpan, ubah, hapus data
  api/              download lampiran & export Excel
  login/            halaman login
components/         komponen tampilan (tombol, tabel, form, progress bar)
lib/                logika bersama: koneksi database, login, progres, format rupiah/tanggal
prisma/
  schema.prisma     struktur database  ← ubah di sini kalau mau menambah kolom/tabel
  migrations/       riwayat perubahan database
  seed.ts           data awal
  seed-demo.ts      data demo
database/monitoring.sql   database awal dalam bentuk SQL (untuk Cara B)
uploads/            file lampiran (dibuat otomatis, tidak masuk Git)
proxy.ts            mengarahkan ke /login kalau belum masuk
```

## Mengubah struktur database nanti

Contoh menambah kolom baru:

1. Edit `prisma/schema.prisma` (mis. tambah `npwp String?` di model `Customer`).
2. Jalankan `npx prisma migrate dev --name tambah_npwp_customer`.
3. Prisma membuat migration baru, mengubah tabel, dan memperbarui tipe TypeScript.

## Perintah berguna

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan aplikasi (mode development) |
| `npx prisma studio` | Melihat & mengedit isi database lewat browser |
| `npm run seed:demo` | Mengisi data demo |
| `npm run build` lalu `npm start` | Menjalankan versi production |

## Masalah umum

- **`Can't reach database server`** → PostgreSQL belum jalan, atau password di `.env` salah.
- **`SESSION_SECRET di .env belum diisi`** → isi `SESSION_SECRET` di `.env` minimal 32 karakter.
- **Error `EPERM` saat `prisma generate`** → hentikan `npm run dev` (Ctrl + C) dulu, lalu ulangi.
- **Lampiran hilang setelah pindah laptop** → file ada di folder `uploads/`; salin folder itu bersama database.
