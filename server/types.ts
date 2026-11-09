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

export interface Database {
  areaParkir: AreaParkir[];
  pelapor: Pelapor[];
  penanganan: Penanganan[];
  nextIds: {
    areaParkir: number;
    pelapor: number;
    penanganan: number;
  };
}
