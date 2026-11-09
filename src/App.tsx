import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteRecord, getAreas, getPelapor, getPenanganan, saveRecord } from "./api";
import type { AreaParkir, EntityForm, EntityKey, EntityRecord, Pelapor, Penanganan } from "./types";

type TabKey = EntityKey | "ringkasan";
type AreaForm = Pick<AreaParkir, "nama" | "lokasi" | "kapasitas" | "tersedia" | "status">;
type PelaporForm = Pick<Pelapor, "nama" | "noHp" | "email">;
type PenangananForm = Pick<Penanganan, "areaParkirId" | "pelaporId" | "tanggal" | "deskripsi" | "status">;
type FormRecord = AreaForm | PelaporForm | PenangananForm;

const tabs: { id: TabKey; label: string; icon: string }[] = [
  { id: "ringkasan", label: "Ringkasan", icon: "◫" },
  { id: "areaParkir", label: "Area parkir", icon: "▦" },
  { id: "pelapor", label: "Pelapor", icon: "♙" },
  { id: "penanganan", label: "Penanganan", icon: "◷" },
];

const blankForm: EntityForm = {
  nama: "", lokasi: "", kapasitas: "50", tersedia: "50", status: "Aktif",
  noHp: "", email: "", areaParkirId: "", pelaporId: "",
  tanggal: new Date().toISOString().slice(0, 10), deskripsi: "",
};

const entityLabels: Record<EntityKey, string> = {
  areaParkir: "Area parkir",
  pelapor: "Pelapor",
  penanganan: "Penanganan",
};

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("ringkasan");
  const [areas, setAreas] = useState<AreaParkir[]>([]);
  const [reporters, setReporters] = useState<Pelapor[]>([]);
  const [cases, setCases] = useState<Penanganan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [modalEntity, setModalEntity] = useState<EntityKey | null>(null);
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [form, setForm] = useState<EntityForm>(blankForm);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [nextAreas, nextReporters, nextCases] = await Promise.all([getAreas(), getPelapor(), getPenanganan()]);
      setAreas(nextAreas);
      setReporters(nextReporters);
      setCases(nextCases);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Tidak dapat terhubung ke API server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const totalCapacity = areas.reduce((total, area) => total + area.kapasitas, 0);
  const availableSlots = areas.reduce((total, area) => total + area.tersedia, 0);
  const occupiedSlots = totalCapacity - availableSlots;
  const occupancy = totalCapacity ? Math.round((occupiedSlots / totalCapacity) * 100) : 0;
  const activeCases = cases.filter((item) => item.status !== "Selesai").length;
  const recentCases = useMemo(() => [...cases].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5), [cases]);

  function openForm(entity: EntityKey, record?: EntityRecord) {
    setModalEntity(entity);
    setEditing(record ?? null);
    if (record && entity === "areaParkir") {
      const item = record as AreaParkir;
      setForm({ ...blankForm, nama: item.nama, lokasi: item.lokasi, kapasitas: String(item.kapasitas), tersedia: String(item.tersedia), status: item.status });
    } else if (record && entity === "pelapor") {
      const item = record as Pelapor;
      setForm({ ...blankForm, nama: item.nama, noHp: item.noHp, email: item.email });
    } else if (record && entity === "penanganan") {
      const item = record as Penanganan;
      setForm({ ...blankForm, areaParkirId: String(item.areaParkirId), pelaporId: String(item.pelaporId), tanggal: item.tanggal, deskripsi: item.deskripsi, status: item.status });
    } else {
      setForm({ ...blankForm, areaParkirId: String(areas[0]?.id ?? ""), pelaporId: String(reporters[0]?.id ?? "") });
    }
  }

  function closeForm() {
    setModalEntity(null);
    setEditing(null);
    setForm(blankForm);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalEntity) return;
    const body: FormRecord = modalEntity === "areaParkir"
      ? { nama: form.nama, lokasi: form.lokasi, kapasitas: Number(form.kapasitas), tersedia: Number(form.tersedia), status: form.status as AreaForm["status"] }
      : modalEntity === "pelapor"
        ? { nama: form.nama, noHp: form.noHp, email: form.email }
        : { areaParkirId: Number(form.areaParkirId), pelaporId: Number(form.pelaporId), tanggal: form.tanggal, deskripsi: form.deskripsi, status: form.status as PenangananForm["status"] };

    setSaving(true);
    setError("");
    try {
      await saveRecord(modalEntity, editing?.id ?? null, body as Record<string, string | number>);
      closeForm();
      setNotice(`${entityLabels[modalEntity]} berhasil ${editing ? "diperbarui" : "ditambahkan"}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Data gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entity: EntityKey, id: number) {
    if (!window.confirm(`Hapus data ${entityLabels[entity].toLowerCase()} ini?`)) return;
    setError("");
    try {
      await deleteRecord(entity, id);
      setNotice(`${entityLabels[entity]} berhasil dihapus.`);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Data gagal dihapus.");
    }
  }

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "Ringkasan";
  const filteredAreas = areas.filter((item) => `${item.nama} ${item.lokasi} ${item.status}`.toLowerCase().includes(search.toLowerCase()));
  const filteredReporters = reporters.filter((item) => `${item.nama} ${item.email} ${item.noHp}`.toLowerCase().includes(search.toLowerCase()));
  const filteredCases = cases.filter((item) => {
    const reporter = reporters.find((person) => person.id === item.pelaporId)?.nama ?? "";
    const area = areas.find((place) => place.id === item.areaParkirId)?.nama ?? "";
    return `${item.deskripsi} ${item.status} ${reporter} ${area}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActiveTab("ringkasan"); }}>
          <span className="brand-mark"><span /></span>
          <span className="brand-copy"><strong>parkir<span>ku</span></strong><small>SMART PARKING SYSTEM</small></span>
        </a>
        <div className="nav-caption">MENU UTAMA</div>
        <nav className="side-nav" aria-label="Navigasi utama">
          {tabs.map((tab) => (
            <button key={tab.id} className={`nav-item ${activeTab === tab.id ? "selected" : ""}`} onClick={() => { setActiveTab(tab.id); setSearch(""); }}>
              <span className="nav-icon">{tab.icon}</span><span>{tab.label}</span>
              {tab.id === "penanganan" && activeCases > 0 && <span className="nav-count">{activeCases}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon">?</div><strong>Butuh bantuan?</strong><p>Hubungi tim support kami jika mengalami kendala.</p><a href="mailto:support@parkirku.id">Hubungi support <span>↗</span></a></div>
          <div className="profile"><div className="avatar">AD</div><div className="profile-copy"><strong>Admin Parkir</strong><span>Administrator</span></div><button className="more-button" aria-label="Menu profil">···</button></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar"><div className="breadcrumbs">Manajemen <span>/</span> <strong>{activeLabel}</strong></div><div className="topbar-right"><span className="today">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</span><button className="icon-button notification" aria-label="Notifikasi">♧<i /></button><div className="mini-avatar">AD</div></div></header>

        <div className="page-content">
          {error && <div className="alert alert-error" role="alert"><span>!</span>{error}<button onClick={() => setError("")} aria-label="Tutup">×</button></div>}
          {notice && <div className="alert alert-success" role="status"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Tutup">×</button></div>}
          {activeTab === "ringkasan" ? (
            <Dashboard areas={areas} reporters={reporters} cases={recentCases} totalCapacity={totalCapacity} availableSlots={availableSlots} occupiedSlots={occupiedSlots} occupancy={occupancy} activeCases={activeCases} loading={loading} onNavigate={setActiveTab} onAdd={() => openForm("penanganan")} />
          ) : (
            <section className="management-page">
              <div className="page-heading"><div><div className="eyebrow">DATA &amp; OPERASIONAL</div><h1>{activeLabel}</h1><p>Kelola informasi {activeLabel.toLowerCase()} sistem parkir Anda.</p></div><button className="primary-button" onClick={() => openForm(activeTab)}><span>＋</span> Tambah {activeLabel}</button></div>
              <div className="table-card">
                <div className="table-toolbar"><div className="table-title"><strong>Daftar {activeLabel}</strong><span>{activeTab === "areaParkir" ? areas.length : activeTab === "pelapor" ? reporters.length : cases.length} data</span></div><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari data..." aria-label="Cari data" /><kbd>⌘ K</kbd></label><button className="filter-button" aria-label="Filter">☷ <span>Filter</span></button></div>
                {loading ? <div className="loading-state"><span className="spinner" />Memuat data dari API...</div> : (
                  activeTab === "areaParkir" ? <AreaTable records={filteredAreas} onEdit={(item) => openForm("areaParkir", item)} onDelete={(id) => void handleDelete("areaParkir", id)} /> :
                    activeTab === "pelapor" ? <ReporterTable records={filteredReporters} onEdit={(item) => openForm("pelapor", item)} onDelete={(id) => void handleDelete("pelapor", id)} /> :
                      <CaseTable records={filteredCases} areas={areas} reporters={reporters} onEdit={(item) => openForm("penanganan", item)} onDelete={(id) => void handleDelete("penanganan", id)} />
                )}
              </div>
              <div className="api-footnote"><span className="status-dot" /> Data tersinkronisasi langsung dengan API server</div>
            </section>
          )}
        </div>
      </main>
      {modalEntity && <FormModal entity={modalEntity} editing={editing} form={form} setForm={setForm} areas={areas} reporters={reporters} saving={saving} onClose={closeForm} onSave={handleSave} />}
    </div>
  );
}

function Dashboard({ areas, reporters, cases, totalCapacity, availableSlots, occupiedSlots, occupancy, activeCases, loading, onNavigate, onAdd }: {
  areas: AreaParkir[]; reporters: Pelapor[]; cases: Penanganan[]; totalCapacity: number; availableSlots: number; occupiedSlots: number; occupancy: number; activeCases: number; loading: boolean; onNavigate: (tab: TabKey) => void; onAdd: () => void;
}) {
  return (
    <section className="dashboard">
      <div className="page-heading dashboard-heading"><div><div className="eyebrow">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("id-ID")}</div><h1>Selamat pagi, Admin <span>✦</span></h1><p>Berikut ringkasan aktivitas parkir Anda hari ini.</p></div><button className="outline-button" onClick={onAdd}><span>＋</span> Buat laporan</button></div>
      <div className="stats-grid">
        <StatCard label="Total kapasitas" value={totalCapacity} unit="slot parkir" icon="▦" tone="blue" trend={`${areas.length} area parkir aktif`} />
        <StatCard label="Slot tersedia" value={availableSlots} unit={`dari ${totalCapacity} slot`} icon="◉" tone="green" trend="Siap digunakan" />
        <StatCard label="Slot terisi" value={occupiedSlots} unit={`${occupancy}% kapasitas`} icon="▥" tone="purple" trend="Sedang digunakan" />
        <StatCard label="Laporan aktif" value={activeCases} unit="perlu penanganan" icon="◷" tone="orange" trend={`${cases.length} laporan terbaru`} />
      </div>
      <div className="overview-grid">
        <div className="panel area-panel"><div className="panel-heading"><div><h2>Ketersediaan area parkir</h2><p>Pantau kapasitas dan slot tersedia secara real-time.</p></div><button className="text-button" onClick={() => onNavigate("areaParkir")}>Lihat semua <span>→</span></button></div>
          {loading ? <div className="loading-state compact"><span className="spinner" />Memuat data...</div> : <div className="area-list">{areas.slice(0, 4).map((area) => <div className="area-row" key={area.id}><div className="parking-icon">P</div><div className="area-info"><strong>{area.nama}</strong><span>{area.lokasi}</span></div><div className="area-availability"><div className="availability-label"><strong>{area.tersedia}</strong><span> / {area.kapasitas} slot</span></div><div className="progress-track"><div className={`progress-fill ${area.status === "Perawatan" ? "maintenance-fill" : ""}`} style={{ width: `${area.kapasitas ? (area.tersedia / area.kapasitas) * 100 : 0}%` }} /></div></div><span className={`badge ${area.status === "Aktif" ? "badge-active" : "badge-maintenance"}`}><i />{area.status}</span></div>)}</div>}
        </div>
        <div className="panel occupancy-panel"><div className="panel-heading"><div><h2>Ringkasan kapasitas</h2><p>Kondisi seluruh area parkir.</p></div><button className="more-button">···</button></div><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(#4c6fff ${occupancy}%, #e9edf5 ${occupancy}% 100%)` }}><div className="donut-hole"><strong>{occupancy}%</strong><span>terisi</span></div></div></div><div className="legend"><div><span className="legend-dot filled" /> <span>Slot terisi</span><strong>{occupiedSlots}</strong></div><div><span className="legend-dot available" /> <span>Tersedia</span><strong>{availableSlots}</strong></div></div></div>
      </div>
      <div className="panel activity-panel"><div className="panel-heading"><div><h2>Laporan terbaru</h2><p>Pembaruan laporan dan penanganan terakhir.</p></div><button className="text-button" onClick={() => onNavigate("penanganan")}>Lihat semua <span>→</span></button></div>
        {loading ? <div className="loading-state compact"><span className="spinner" />Memuat data...</div> : cases.length === 0 ? <div className="empty-state">Belum ada laporan penanganan.</div> : <div className="activity-table"><div className="activity-header"><span>PELAPOR</span><span>LAPORAN</span><span>AREA PARKIR</span><span>TANGGAL</span><span>STATUS</span></div>{cases.map((item) => <div className="activity-row" key={item.id}><div className="person-cell"><div className={`person-avatar avatar-color-${item.pelaporId % 4}`}>{(reporters.find((person) => person.id === item.pelaporId)?.nama ?? "P").split(" ").map((word) => word[0]).slice(0, 2).join("")}</div><strong>{reporters.find((person) => person.id === item.pelaporId)?.nama ?? "Pelapor dihapus"}</strong></div><span className="report-description">{item.deskripsi}</span><span>{areas.find((area) => area.id === item.areaParkirId)?.nama ?? "Area dihapus"}</span><span>{formatDate(item.tanggal)}</span><StatusBadge status={item.status} /></div>)}</div>}
      </div>
      <div className="dashboard-bottom"><span>© 2025 ParkirKu. Dibuat untuk pengelolaan parkir yang lebih baik.</span><div><button onClick={() => onNavigate("pelapor")}>Data pelapor ({reporters.length})</button><button onClick={() => onNavigate("penanganan")}>Semua laporan</button></div></div>
    </section>
  );
}

function StatCard({ label, value, unit, icon, tone, trend }: { label: string; value: number; unit: string; icon: string; tone: string; trend: string }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><div className="stat-value">{value.toLocaleString("id-ID")}<span>{unit}</span></div><div className="stat-trend"><span className="trend-mark">↗</span>{trend}</div></div>;
}

function AreaTable({ records, onEdit, onDelete }: { records: AreaParkir[]; onEdit: (item: AreaParkir) => void; onDelete: (id: number) => void }) {
  if (!records.length) return <div className="empty-state">Data area parkir tidak ditemukan.</div>;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>NAMA AREA</th><th>LOKASI</th><th>KAPASITAS</th><th>TERSEDIA</th><th>STATUS</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><div className="table-primary"><div className="parking-icon small">P</div><strong>{item.nama}</strong></div></td><td>{item.lokasi}</td><td>{item.kapasitas} slot</td><td><strong className="available-number">{item.tersedia}</strong> slot</td><td><span className={`badge ${item.status === "Aktif" ? "badge-active" : "badge-maintenance"}`}><i />{item.status}</span></td><td><RowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></td></tr>)}</tbody></table></div>;
}

function ReporterTable({ records, onEdit, onDelete }: { records: Pelapor[]; onEdit: (item: Pelapor) => void; onDelete: (id: number) => void }) {
  if (!records.length) return <div className="empty-state">Data pelapor tidak ditemukan.</div>;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>NAMA PELAPOR</th><th>NOMOR HP</th><th>EMAIL</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><div className="person-cell"><div className={`person-avatar avatar-color-${item.id % 4}`}>{item.nama.split(" ").map((word) => word[0]).slice(0, 2).join("")}</div><strong>{item.nama}</strong></div></td><td>{item.noHp}</td><td>{item.email}</td><td><RowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></td></tr>)}</tbody></table></div>;
}

function CaseTable({ records, areas, reporters, onEdit, onDelete }: { records: Penanganan[]; areas: AreaParkir[]; reporters: Pelapor[]; onEdit: (item: Penanganan) => void; onDelete: (id: number) => void }) {
  if (!records.length) return <div className="empty-state">Data penanganan tidak ditemukan.</div>;
  return <div className="data-table-wrap"><table className="data-table"><thead><tr><th>PELAPOR</th><th>DESKRIPSI</th><th>AREA PARKIR</th><th>TANGGAL</th><th>STATUS</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td><div className="person-cell"><div className={`person-avatar avatar-color-${item.pelaporId % 4}`}>{(reporters.find((person) => person.id === item.pelaporId)?.nama ?? "P").split(" ").map((word) => word[0]).slice(0, 2).join("")}</div><strong>{reporters.find((person) => person.id === item.pelaporId)?.nama ?? "Pelapor dihapus"}</strong></div></td><td className="description-cell">{item.deskripsi}</td><td>{areas.find((area) => area.id === item.areaParkirId)?.nama ?? "Area dihapus"}</td><td>{formatDate(item.tanggal)}</td><td><StatusBadge status={item.status} /></td><td><RowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} /></td></tr>)}</tbody></table></div>;
}

function StatusBadge({ status }: { status: Penanganan["status"] }) {
  const className = status === "Selesai" ? "badge-done" : status === "Diproses" ? "badge-progress" : "badge-new";
  return <span className={`badge ${className}`}><i />{status}</span>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="row-actions"><button onClick={onEdit} aria-label="Edit data" title="Edit">✎</button><button onClick={onDelete} aria-label="Hapus data" title="Hapus">⌫</button></div>;
}

function FormModal({ entity, editing, form, setForm, areas, reporters, saving, onClose, onSave }: {
  entity: EntityKey; editing: EntityRecord | null; form: EntityForm; setForm: (form: EntityForm) => void; areas: AreaParkir[]; reporters: Pelapor[]; saving: boolean; onClose: () => void; onSave: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const label = entityLabels[entity];
  const update = (key: keyof EntityForm, value: string) => setForm({ ...form, [key]: value });
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><div className="eyebrow">MANAJEMEN DATA</div><h2 id="modal-title">{editing ? "Edit" : "Tambah"} {label}</h2><p>Lengkapi informasi di bawah ini.</p></div><button className="modal-close" onClick={onClose} aria-label="Tutup">×</button></div><form onSubmit={onSave}><div className="form-fields">
    {entity === "areaParkir" && <>
      <Field label="Nama area"><input required value={form.nama} onChange={(event) => update("nama", event.target.value)} placeholder="Contoh: Parkir Utama" /></Field>
      <Field label="Lokasi"><input required value={form.lokasi} onChange={(event) => update("lokasi", event.target.value)} placeholder="Contoh: Gedung A" /></Field>
      <div className="form-row"><Field label="Kapasitas"><input required type="number" min="1" value={form.kapasitas} onChange={(event) => update("kapasitas", event.target.value)} /></Field><Field label="Slot tersedia"><input required type="number" min="0" value={form.tersedia} onChange={(event) => update("tersedia", event.target.value)} /></Field></div>
      <Field label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value)}><option>Aktif</option><option>Perawatan</option></select></Field>
    </>}
    {entity === "pelapor" && <>
      <Field label="Nama lengkap"><input required value={form.nama} onChange={(event) => update("nama", event.target.value)} placeholder="Nama pelapor" /></Field>
      <Field label="Nomor HP"><input required type="tel" value={form.noHp} onChange={(event) => update("noHp", event.target.value)} placeholder="08xx-xxxx-xxxx" /></Field>
      <Field label="Alamat email"><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="nama@email.com" /></Field>
    </>}
    {entity === "penanganan" && <>
      <Field label="Pelapor"><select required value={form.pelaporId} onChange={(event) => update("pelaporId", event.target.value)}><option value="">Pilih pelapor</option>{reporters.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></Field>
      <Field label="Area parkir"><select required value={form.areaParkirId} onChange={(event) => update("areaParkirId", event.target.value)}><option value="">Pilih area parkir</option>{areas.map((item) => <option key={item.id} value={item.id}>{item.nama} — {item.lokasi}</option>)}</select></Field>
      <Field label="Deskripsi laporan"><textarea required rows={3} value={form.deskripsi} onChange={(event) => update("deskripsi", event.target.value)} placeholder="Jelaskan masalah yang dilaporkan..." /></Field>
      <div className="form-row"><Field label="Tanggal"><input required type="date" value={form.tanggal} onChange={(event) => update("tanggal", event.target.value)} /></Field><Field label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value)}><option>Baru</option><option>Diproses</option><option>Selesai</option></select></Field></div>
    </>}
    </div><div className="modal-actions"><button className="outline-button" type="button" onClick={onClose}>Batal</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Simpan data"}</button></div></form></section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export default App;
