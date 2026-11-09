import type { AreaParkir, EntityKey, EntityRecord, Pelapor, Penanganan } from "./types";

const paths: Record<EntityKey, string> = {
  areaParkir: "area-parkir",
  pelapor: "pelapor",
  penanganan: "penanganan",
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? `Permintaan gagal (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function getAreas(): Promise<AreaParkir[]> {
  return request(`/api/${paths.areaParkir}`);
}

export function getPelapor(): Promise<Pelapor[]> {
  return request(`/api/${paths.pelapor}`);
}

export function getPenanganan(): Promise<Penanganan[]> {
  return request(`/api/${paths.penanganan}`);
}

export function saveRecord<T extends EntityRecord>(
  entity: EntityKey,
  id: number | null,
  record: Record<string, string | number>,
): Promise<T> {
  return request(`/api/${paths[entity]}${id === null ? "" : `/${id}`}`, {
    method: id === null ? "POST" : "PUT",
    body: JSON.stringify(record),
  });
}

export function deleteRecord(entity: EntityKey, id: number): Promise<EntityRecord> {
  return request(`/api/${paths[entity]}/${id}`, { method: "DELETE" });
}
