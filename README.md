# CatetYuk

Aplikasi manajemen keuangan pribadi berbahasa Indonesia: catat pemasukan dan pengeluaran, anggaran bulanan, target tabungan, perbandingan periode, dan analisis keuangan.

**Teknologi:** Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage, Row Level Security).

## Fitur
- Registrasi, login, logout, dan route terlindungi
- Dashboard: filter periode, grafik, distribusi pengeluaran, wawasan
- Catat pemasukan dan pengeluaran (dengan bukti gambar), riwayat dengan filter dan ekspor CSV
- Anggaran bulanan dengan peringatan 70/90/100%
- Target tabungan (kontribusi dihitung sebagai alokasi, bukan pemasukan)
- Perbandingan keuangan dua periode dan Financial Intelligence berbasis aturan
- Pengaturan: profil, password, kategori kustom, hapus akun, tema gelap/terang

## Menjalankan
1. `npm install`
2. Buat project di supabase.com, lalu jalankan `supabase/schema.sql` dan `supabase/storage.sql` di SQL Editor
3. Salin `.env.example` menjadi `.env.local` dan isi nilainya
4. `npm run dev`, lalu buka http://localhost:3000

## Variabel lingkungan
| Nama | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Kunci anon/publishable (aman di klien) |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci rahasia, hanya untuk server (hapus akun). Jangan di-commit |

## Keamanan
Semua tabel memakai Row Level Security: pengguna hanya dapat membaca dan mengubah datanya sendiri. Bukti gambar disimpan di bucket privat per pengguna.
