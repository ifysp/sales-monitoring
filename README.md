# SWIT Sales Monitoring — ViewPoint 6 & Tricefy (v3)

Sistem pencatatan & monitoring penjualan **ViewPoint 6** dan **Tricefy** untuk divisi Product Specialist SWIT, Beyond Medical.
Gabungan SRS *Sales Monitoring* (Site, Alat USG, PC, Instalasi VP6, Akun & Langganan Tricefy, PO, Invoice)
dengan alur dokumen PO: **PO diterima → Invoice & BA → Tukar faktur → Penagihan → Clear**, lampiran wajib di tiap langkah.

**Stack:** Next.js 16 · TypeScript · Prisma 7 · PostgreSQL · Tailwind CSS · ExcelJS

---

## 1. Persiapan (sekali saja)

- **Node.js** 20 atau lebih baru → cek: `node -v`
- **PostgreSQL** + **pgAdmin**, dengan database kosong bernama **`monitoring`**

> **Sudah memasang versi sebelumnya (v1/v2)?** Struktur database v3 berbeda. Di pgAdmin: klik kanan database
> `monitoring` → **Delete/Drop**, lalu buat lagi database kosong bernama `monitoring`. Hapus juga folder `uploads/` lama.

## 2. Setup project

```powershell
# 1) Buat file .env (WAJIB sebelum npm install)
copy .env.example .env
```

Buka `.env`, ganti `PASSWORD_ANDA` dengan password PostgreSQL Anda. Lalu:

```powershell
# 2) Install library (otomatis menjalankan "prisma generate")
npm install
```

## 3. Isi database — pilih SALAH SATU

**Cara A (disarankan):**

```powershell
npx prisma migrate deploy   # membuat semua tabel
npx prisma db seed          # 2 akun Admin + model alat USG
```

**Cara B — pgAdmin:** klik kanan database `monitoring` (kosong) → **Query Tool** → buka `database/monitoring.sql` → **Execute (F5)**.

**Opsional — data demo** (3 customer, 4 alat, 2 PO beserta file contoh, VP6 multi & standalone, 3 akun Tricefy dengan status berbeda):

```powershell
npm run seed:demo
```

## 4. Jalankan

```powershell
npm run dev
```

Buka **http://localhost:3000**. Akun awal (keduanya **Admin**):

| Nama | Email | Password awal |
| --- | --- | --- |
| Kak Sara | `sara@swit.local` | `Admin12345` |
| Minnie | `minnie@swit.local` | `Admin12345` |

Segera ganti password di **Pengaturan → Akun saya**.

---

## Cara pakai singkat

Semua berawal dari **Customer / Site** (satu RS/klinik = satu Site ID GE). Halaman detail customer adalah pusat data,
dengan tab: Ringkasan · PO & Invoice · ViewPoint 6 · Tricefy · Alat & PC · Catatan teknis · Riwayat.

Alur penjualan:

1. **Customer baru** → nama & Site ID GE. Daftarkan **Alat USG** (SN unik) dan **PC**.
2. **+ Purchase Order** → nomor PO, tanggal diterima, cash/cicilan, **file PO**. *Tanpa harga.*
3. Di PO: **+ ViewPoint 6** / **+ Tricefy** untuk mencatat produk yang dibeli.
4. **Invoice & BA**: no. invoice, tanggal, **harga final**, tanggal BA, file invoice & file BA.
5. **Tukar faktur**: tanggal + file tanda terima.
6. **Penagihan**: cash = 1 termin otomatis; cicilan = buat jadwal N termin. Tandai **Lunas** per termin dengan **bukti bayar**.
7. Semua termin lunas → **Clear** otomatis.

Setiap langkah baru terbuka setelah langkah sebelumnya lengkap (tidak bisa dilompati) dan dicek juga di server.
Mundur dilakukan dari langkah terakhir: Batal lunas → Batalkan tukar faktur → Batalkan invoice & BA. File lampiran tetap tersimpan.

## Fitur vs SRS

| SRS | Di aplikasi |
| --- | --- |
| FR-01 Autentikasi | Login email & password, ganti password, sesi berakhir otomatis 8 jam |
| FR-02 Site | Menu **Customer / Site**, Site ID unik, halaman detail bertab |
| FR-03 Alat USG | Menu **Alat USG**, SN unik, detail berisi riwayat VP6 & Tricefy |
| FR-04 PC | Menu **PC**: sumber, peran (Server+Client/Server/Client), CPU/RAM/Storage/VGA/OS |
| FR-05 Instalasi VP6 | Banyak alat & PC per instalasi, topologi otomatis, riwayat versi + "Catat upgrade", apps, special config |
| FR-06 Tricefy | Akun (ID unik) → langganan; berakhir default +3 tahun; status Aktif/Akan habis/Kedaluwarsa; perpanjangan = riwayat |
| FR-07 PO & Invoice | PO tanpa harga; 1 invoice per PO berisi harga final; BA & tukar faktur; penagihan per termin dengan bukti bayar; lampiran wajib per langkah; progress bar |
| FR-08 Dashboard | Ringkasan, grafik instalasi/aktivasi per bulan, Tricefy akan habis, penjualan (dari invoice), penagihan jatuh tempo, aktivitas terbaru |
| FR-09 Cari/Filter/Export | Pencarian global di atas; filter di setiap tabel; **Export Excel** sesuai filter |
| FR-10 Pengingat | Lonceng + halaman **Notifikasi** (Tricefy 90/60/30 hari & kedaluwarsa, termin terlambat / ≤ 7 hari) |
| FR-11 Import | *Tidak dipakai — mulai dengan data baru* |
| FR-12 Audit trail | Setiap tambah/ubah/hapus tercatat dengan nilai sebelum → sesudah; tab **Riwayat** di tiap detail |

**Hak akses:** Admin = lihat, tambah, ubah, hapus. Viewer = hanya lihat (disiapkan untuk pengguna baru).

**Hapus** selalu minta konfirmasi mengetik `HAPUS` dan memakai *soft delete* (data hanya ditandai terhapus).
Buka **Pengaturan → Data terhapus** untuk **Pulihkan** atau **Hapus permanen** (benar-benar hilang dari database, termasuk file lampirannya).

**Ditunda untuk pengembangan berikutnya:** package ViewPoint 6 & Tricefy, harga per produk, import data lama.

---

## Struktur folder

```
app/(app)/          halaman setelah login (customers, orders, invoices = penagihan, viewpoint, tricefy, devices, pcs, reports, settings…)
app/actions/        server actions = "backend" (simpan/ubah/hapus, urutan langkah PO, data terhapus)
app/api/            unduh lampiran & export Excel
components/         tampilan: app-shell (sidebar + cari + lonceng), ui, form, progress bar, riwayat
lib/                logika bersama: database, login, audit, query & filter, alur PO (progress.ts), status Tricefy, format
prisma/schema.prisma   struktur database  ← ubah di sini untuk menambah kolom/tabel
prisma/migrations/  riwayat perubahan database
prisma/seed.ts      data awal · prisma/seed-demo.ts data demo
database/monitoring.sql  database awal (Cara B)
uploads/            file lampiran (otomatis, tidak masuk Git)
```

## Mengubah struktur database nanti

1. Edit `prisma/schema.prisma` (mis. tambah `npwp String?` di model `Customer`).
2. `npx prisma migrate dev --name tambah_npwp_customer`

## Masalah umum

- **`Can't reach database server`** → PostgreSQL belum jalan / password di `.env` salah.
- **`SESSION_SECRET … belum diisi`** → isi `SESSION_SECRET` di `.env` (≥ 32 karakter).
- **`EPERM` saat `prisma generate`** → hentikan `npm run dev` (Ctrl + C) dulu.
- **Tabel sudah ada / error kolom saat migrate** → database berisi versi lama; drop & buat ulang database `monitoring`.
- **Login gagal** → pakai `sara@swit.local` / `minnie@swit.local` dengan `Admin12345`, dan pastikan `npx prisma db seed` sudah dijalankan.
