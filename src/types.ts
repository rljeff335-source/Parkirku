export interface AreaParkir {
  id: number;
  nama: string;
  lokasi: string;
  kapasitas: number;
  tersedia: number;
  status: "Aktif" | "Perawatan";
}

export interface Pelapor {
  id: number;
  nama: string;
  noHp: string;
  email: string;
}

export interface Penanganan {
  id: number;
  areaParkirId: number;
  pelaporId: number;
  tanggal: string;
  deskripsi: string;
  status: "Baru" | "Diproses" | "Selesai";
}

export type EntityKey = "areaParkir" | "pelapor" | "penanganan";
export type EntityRecord = AreaParkir | Pelapor | Penanganan;

export interface EntityForm {
  nama: string;
  lokasi: string;
  kapasitas: string;
  tersedia: string;
  status: string;
  noHp: string;
  email: string;
  areaParkirId: string;
  pelaporId: string;
  tanggal: string;
  deskripsi: string;
}
