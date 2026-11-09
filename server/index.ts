import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { readDatabase, writeDatabase } from "./store.js";
import type { AreaParkir, Database, Pelapor, Penanganan } from "./types.js";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);

app.use(cors());
app.use(express.json());

type Collection = "areaParkir" | "pelapor" | "penanganan";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) fail(400, `${label} wajib diisi.`);
  return value.trim();
}

function positiveInteger(value: unknown, label: string, allowZero = false): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < (allowZero ? 0 : 1)) {
    fail(400, `${label} harus berupa angka ${allowZero ? "nol atau lebih" : "lebih dari nol"}.`);
  }
  return parsed;
}

function collectionFromRequest(request: Request): Collection {
  const collection = request.params.collection;
  if (collection === "area-parkir") return "areaParkir";
  if (collection === "pelapor" || collection === "penanganan") return collection;
  return fail(404, "Entitas tidak ditemukan.");
}

function validateRecord(
  collection: Collection,
  body: unknown,
  database: Database,
): Omit<AreaParkir, "id"> | Omit<Pelapor, "id"> | Omit<Penanganan, "id"> {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "Data yang dikirim tidak valid.");
  const input = body as Record<string, unknown>;

  if (collection === "areaParkir") {
    const kapasitas = positiveInteger(input.kapasitas, "Kapasitas");
    const tersedia = positiveInteger(input.tersedia, "Slot tersedia", true);
    if (tersedia > kapasitas) fail(400, "Slot tersedia tidak boleh melebihi kapasitas.");
    if (input.status !== "Aktif" && input.status !== "Perawatan") fail(400, "Status area parkir tidak valid.");
    return {
      nama: requiredText(input.nama, "Nama area"),
      lokasi: requiredText(input.lokasi, "Lokasi"),
      kapasitas,
      tersedia,
      status: input.status,
    };
  }

  if (collection === "pelapor") {
    const email = requiredText(input.email, "Email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "Format email tidak valid.");
    return {
      nama: requiredText(input.nama, "Nama pelapor"),
      noHp: requiredText(input.noHp, "Nomor HP"),
      email,
    };
  }

  const areaParkirId = positiveInteger(input.areaParkirId, "Area parkir");
  const pelaporId = positiveInteger(input.pelaporId, "Pelapor");
  if (!database.areaParkir.some((area) => area.id === areaParkirId)) fail(400, "Area parkir tidak ditemukan.");
  if (!database.pelapor.some((pelapor) => pelapor.id === pelaporId)) fail(400, "Pelapor tidak ditemukan.");
  if (input.status !== "Baru" && input.status !== "Diproses" && input.status !== "Selesai") {
    fail(400, "Status penanganan tidak valid.");
  }
  const tanggal = requiredText(input.tanggal, "Tanggal");
  if (Number.isNaN(Date.parse(tanggal))) fail(400, "Format tanggal tidak valid.");
  return {
    areaParkirId,
    pelaporId,
    tanggal,
    deskripsi: requiredText(input.deskripsi, "Deskripsi"),
    status: input.status,
  };
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", message: "API Manajemen Parkir aktif." });
});

app.get("/api/:collection", async (request, response, next) => {
  try {
    const collection = collectionFromRequest(request);
    const database = await readDatabase();
    response.json(database[collection]);
  } catch (error) {
    next(error);
  }
});

app.post("/api/:collection", async (request, response, next) => {
  try {
    const collection = collectionFromRequest(request);
    const database = await readDatabase();
    const record = validateRecord(collection, request.body, database);
    const created = { ...record, id: database.nextIds[collection]++ };
    database[collection].push(created as never);
    await writeDatabase(database);
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.put("/api/:collection/:id", async (request, response, next) => {
  try {
    const collection = collectionFromRequest(request);
    const id = positiveInteger(request.params.id, "ID");
    const database = await readDatabase();
    const index = database[collection].findIndex((record) => record.id === id);
    if (index < 0) fail(404, "Data yang akan diperbarui tidak ditemukan.");
    const record = validateRecord(collection, request.body, database);
    const updated = { ...record, id };
    database[collection][index] = updated as never;
    await writeDatabase(database);
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/:collection/:id", async (request, response, next) => {
  try {
    const collection = collectionFromRequest(request);
    const id = positiveInteger(request.params.id, "ID");
    const database = await readDatabase();
    if (collection === "areaParkir" && database.penanganan.some((item) => item.areaParkirId === id)) {
      fail(409, "Area parkir masih digunakan oleh data penanganan.");
    }
    if (collection === "pelapor" && database.penanganan.some((item) => item.pelaporId === id)) {
      fail(409, "Pelapor masih digunakan oleh data penanganan.");
    }
    const index = database[collection].findIndex((record) => record.id === id);
    if (index < 0) fail(404, "Data yang akan dihapus tidak ditemukan.");
    const [deleted] = database[collection].splice(index, 1);
    await writeDatabase(database);
    response.json(deleted);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({ message: error.message });
    return;
  }
  console.error("API error:", error);
  response.status(500).json({ message: "Terjadi kesalahan pada server." });
});

app.listen(port, () => {
  console.log(`API Manajemen Parkir berjalan di http://localhost:${port}`);
});
