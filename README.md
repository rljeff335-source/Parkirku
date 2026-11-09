# ParkirKu — Sistem Manajemen Parkir

Aplikasi UTS untuk pengelolaan area parkir, pelapor, dan penanganan laporan. Web client React + TypeScript berkomunikasi dua arah dengan REST API Express melalui operasi CRUD. Data API disimpan di `data/parking-data.json` dan dibuat otomatis saat pertama kali server dijalankan.

## Teknologi

- Web: Vite, React, TypeScript, CSS responsif
- API: Node.js, Express, TypeScript
- Penyimpanan: file JSON lokal

## Menjalankan aplikasi

Persyaratan: Node.js 20 atau lebih baru dan npm.

```bash
npm install
npm run dev
```

Web tersedia di `http://localhost:5173`, API di `http://localhost:3001`. Vite meneruskan request `/api` ke API server. Jalankan `npm run build` untuk memeriksa TypeScript dan membangun web.

## Dokumentasi API

Semua endpoint mengembalikan JSON. Untuk request `POST` dan `PUT`, gunakan header `Content-Type: application/json`. Error dikembalikan dalam format `{ "message": "..." }`.

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | Status API |
| GET | `/api/area-parkir` | Daftar area parkir |
| POST | `/api/area-parkir` | Tambah area parkir |
| PUT | `/api/area-parkir/:id` | Ubah area parkir |
| DELETE | `/api/area-parkir/:id` | Hapus area parkir |
| GET | `/api/pelapor` | Daftar pelapor |
| POST | `/api/pelapor` | Tambah pelapor |
| PUT | `/api/pelapor/:id` | Ubah pelapor |
| DELETE | `/api/pelapor/:id` | Hapus pelapor |
| GET | `/api/penanganan` | Daftar penanganan |
| POST | `/api/penanganan` | Tambah penanganan |
| PUT | `/api/penanganan/:id` | Ubah penanganan |
| DELETE | `/api/penanganan/:id` | Hapus penanganan |

### Contoh payload

```json
{
  "nama": "Parkir Gedung D",
  "lokasi": "Gedung D",
  "kapasitas": 100,
  "tersedia": 42,
  "status": "Aktif"
}
```

Payload `pelapor`: `{ "nama": "Budi", "noHp": "08123456789", "email": "budi@email.com" }`.

Payload `penanganan`: `{ "areaParkirId": 1, "pelaporId": 1, "tanggal": "2025-02-24", "deskripsi": "Palang parkir bermasalah", "status": "Baru" }`. Status area: `Aktif` atau `Perawatan`; status penanganan: `Baru`, `Diproses`, atau `Selesai`. Area atau pelapor yang masih direferensikan penanganan tidak dapat dihapus (HTTP 409).

## Cakupan CRUD web

- **Area parkir:** tambah, lihat, cari, ubah, dan hapus data serta kapasitas dan ketersediaan slot.
- **Pelapor:** tambah, lihat, cari, ubah, dan hapus informasi kontak.
- **Penanganan:** tambah, lihat, cari, ubah status, dan hapus laporan yang terhubung dengan area parkir dan pelapor.
- Dashboard menampilkan ringkasan data yang dibaca dari API server.
