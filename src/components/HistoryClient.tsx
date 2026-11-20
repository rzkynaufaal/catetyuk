"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Paperclip, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, type Tx } from "@/lib/finance";

type Cat = { id: string; name: string; type: string };
const PER = 10;
const fd = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

export default function HistoryClient({ tx, cats }: { tx: Tx[]; cats: Cat[] }) {
  const router = useRouter();
  const [q, setQ] = useState(""), [type, setType] = useState(""), [cat, setCat] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState(""), [sort, setSort] = useState("new"), [page, setPage] = useState(1);
  const cn = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);
  const rows = useMemo(() => {
    const a = tx.filter((t) => (!q || t.name.toLowerCase().includes(q.toLowerCase())) && (!type || t.type === type) && (!cat || t.category_id === cat) && (!from || t.tx_date >= from) && (!to || t.tx_date <= to));
    const s: Record<string, (x: Tx, y: Tx) => number> = { new: (x, y) => y.tx_date.localeCompare(x.tx_date), old: (x, y) => x.tx_date.localeCompare(y.tx_date), hi: (x, y) => y.amount - x.amount, lo: (x, y) => x.amount - y.amount };
    return a.sort(s[sort]);
  }, [tx, q, type, cat, from, to, sort]);
  const inc = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), out = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const pages = Math.max(1, Math.ceil(rows.length / PER)), cur = Math.min(page, pages), view = rows.slice((cur - 1) * PER, cur * PER);
  const set = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPage(1); };

  async function del(t: Tx) {
    if (!confirm("Hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.")) return;
    const sb = createClient();
    const { error } = await sb.from("transactions").delete().eq("id", t.id);
    if (error) return alert("Gagal menghapus: " + error.message);
    if (t.proof_url) await sb.storage.from("proofs").remove([t.proof_url]);
    router.refresh();
  }
  async function proof(p: string) {
    const { data, error } = await createClient().storage.from("proofs").createSignedUrl(p, 60);
    if (error || !data) return alert("Bukti tidak dapat dibuka.");
    window.open(data.signedUrl, "_blank");
  }
  function csv() {
    if (!rows.length) return alert("Tidak ada data untuk diekspor.");
    const q2 = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const lines = [["Tanggal", "Nama Transaksi", "Kategori", "Tipe", "Metode", "Nominal (IDR)", "Catatan", "Bukti"], ...rows.map((t) => [t.tx_date, t.name, t.category_id ? cn[t.category_id] ?? "" : "", t.type === "income" ? "Pemasukan" : "Pengeluaran", t.payment_method, t.amount, t.notes ?? "", t.proof_url ? "Ada" : "Tidak ada"])];
    const blob = new Blob(["\ufeff" + lines.map((l) => l.map(q2).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "catetyuk-transaksi.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
  const Acts = ({ t }: { t: Tx }) => (
    <span className="flex gap-1">
      {t.proof_url && <button onClick={() => proof(t.proof_url!)} title="Lihat bukti" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"><Paperclip size={15} /></button>}
      <Link href={`/${t.type === "expense" ? "pengeluaran" : "pemasukan"}?id=${t.id}`} title="Ubah" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"><Pencil size={15} /></Link>
      <button onClick={() => del(t)} title="Hapus" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-red-400"><Trash2 size={15} /></button>
    </span>
  );
  const sel = "rounded-lg border border-line bg-rich px-3 py-2 text-sm outline-none focus:border-cg";

  if (!tx.length) return <div className="rounded-2xl border border-line bg-panel p-10 text-center text-mut">Belum ada transaksi. Mulai catat pemasukan atau pengeluaran pertamamu.<div className="mt-4 flex justify-center gap-3"><Link href="/pemasukan" className="rounded-lg bg-bd px-4 py-2 text-sm font-semibold text-white">Catat Pemasukan</Link><Link href="/pengeluaran" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-white">Catat Pengeluaran</Link></div></div>;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={set(setQ)} placeholder="Cari nama transaksi…" className={`${sel} min-w-40 flex-1`} />
        <select value={type} onChange={set(setType)} className={sel}><option value="">Semua Tipe</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option></select>
        <select value={cat} onChange={set(setCat)} className={sel}><option value="">Semua Kategori</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === "income" ? "Masuk" : "Keluar"})</option>)}</select>
        <input type="date" value={from} onChange={set(setFrom)} title="Dari tanggal" className={sel} />
        <input type="date" value={to} onChange={set(setTo)} title="Sampai tanggal" className={sel} />
        <select value={sort} onChange={set(setSort)} className={sel}><option value="new">Terbaru</option><option value="old">Terlama</option><option value="hi">Nominal Tertinggi</option><option value="lo">Nominal Terendah</option></select>
        <button onClick={csv} className={`${sel} flex items-center gap-2 font-semibold hover:border-cg`}><Download size={15} />Ekspor CSV</button>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-mut">
        <span>Total sesuai filter:</span><span className="text-cg">Pemasukan {rupiah(inc)}</span><span className="text-red-400">Pengeluaran {rupiah(out)}</span><span>Selisih {rupiah(inc - out)}</span>
      </div>
      {!rows.length ? <p className="py-10 text-center text-mut">Tidak ada transaksi yang cocok dengan filter.</p> : (<>
        <table className="hidden w-full text-sm md:table">
          <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mut"><th className="py-2">Tanggal</th><th>Nama</th><th>Kategori</th><th>Tipe</th><th>Metode</th><th className="text-right">Nominal</th><th></th></tr></thead>
          <tbody>{view.map((t) => (
            <tr key={t.id} className="border-b border-line/60">
              <td className="py-3 pr-2 whitespace-nowrap">{fd(t.tx_date)}</td><td className="pr-2">{t.name}</td><td className="pr-2 text-mut">{t.category_id ? cn[t.category_id] : "—"}</td>
              <td className="pr-2">{t.type === "income" ? "Pemasukan" : "Pengeluaran"}</td><td className="pr-2 text-mut">{t.payment_method}</td>
              <td className={`pr-2 text-right font-bold tabular-nums ${t.type === "income" ? "text-cg" : "text-red-400"}`}>{t.type === "income" ? "+" : "−"}{rupiah(t.amount)}</td><td><Acts t={t} /></td>
            </tr>))}</tbody>
        </table>
        <div className="space-y-2 md:hidden">{view.map((t) => (
          <div key={t.id} className="rounded-xl border border-line p-3">
            <div className="flex justify-between gap-2"><b className="truncate">{t.name}</b><b className={`tabular-nums ${t.type === "income" ? "text-cg" : "text-red-400"}`}>{t.type === "income" ? "+" : "−"}{rupiah(t.amount)}</b></div>
            <div className="mt-1 text-xs text-mut">{t.category_id ? cn[t.category_id] : "Tanpa kategori"} · {fd(t.tx_date)} · {t.payment_method}</div>
            <div className="mt-2"><Acts t={t} /></div>
          </div>))}</div>
        <div className="flex items-center justify-between text-sm text-mut">
          <span>{rows.length} transaksi · Halaman {cur} dari {pages}</span>
          <span className="flex gap-2"><button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">Sebelumnya</button><button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">Berikutnya</button></span>
        </div>
      </>)}
    </div>
  );
}