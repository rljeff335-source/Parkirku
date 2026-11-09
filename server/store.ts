import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Database } from "./types.js";

const dataPath = join(process.cwd(), "data", "parking-data.json");

const initialData: Database = {
  areaParkir: [
    { id: 1, nama: "Parkir Utama", lokasi: "Gedung A", kapasitas: 120, tersedia: 34, status: "Aktif" },
    { id: 2, nama: "Parkir Selatan", lokasi: "Gedung C", kapasitas: 80, tersedia: 12, status: "Aktif" },
    { id: 3, nama: "Parkir Basement", lokasi: "Gedung B1", kapasitas: 60, tersedia: 0, status: "Perawatan" },
  ],
  pelapor: [
    { id: 1, nama: "Nadia Putri", noHp: "0812-3456-7890", email: "nadia@email.com" },
    { id: 2, nama: "Rizky Pratama", noHp: "0857-1234-5678", email: "rizky@email.com" },
    { id: 3, nama: "Alya Maharani", noHp: "0821-9876-5432", email: "alya@email.com" },
  ],
  penanganan: [
    { id: 1, areaParkirId: 1, pelaporId: 1, tanggal: "2025-02-24", deskripsi: "Palang parkir tidak dapat terbuka.", status: "Diproses" },
    { id: 2, areaParkirId: 2, pelaporId: 2, tanggal: "2025-02-23", deskripsi: "Lampu penerangan di area parkir mati.", status: "Baru" },
    { id: 3, areaParkirId: 1, pelaporId: 3, tanggal: "2025-02-21", deskripsi: "Tiket parkir tidak tercetak.", status: "Selesai" },
  ],
  nextIds: { areaParkir: 4, pelapor: 4, penanganan: 4 },
};

let writeQueue = Promise.resolve();

export async function readDatabase(): Promise<Database> {
  try {
    const contents = await readFile(dataPath, "utf8");
    return JSON.parse(contents) as Database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, `${JSON.stringify(initialData, null, 2)}\n`, "utf8");
    return structuredClone(initialData);
  }
}

export async function writeDatabase(database: Database): Promise<void> {
  const contents = `${JSON.stringify(database, null, 2)}\n`;
  writeQueue = writeQueue.then(async () => {
    await mkdir(dirname(dataPath), { recursive: true });
    await writeFile(dataPath, contents, "utf8");
  });
  await writeQueue;
}
