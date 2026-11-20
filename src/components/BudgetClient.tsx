"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rupiah } from "@/lib/finance";

export type Item = { id: string; name: string; year: number; month: number; category_id: string | null; amount: number; notes: string | null; spent: number; remaining: number; pct: number; count: number; status: "terkendali" | "mendekati" | "hampir_habis" | "terlampaui" };
type Props = { month: string; items: Item[]; cats: { id: string; name: string }[]; cn: Record<string, string>; history: { key: string; budget: number; spent: number }[]; exceeded: [string, number][] };

const ST = {
  terkendali: ["Pengeluaran masih terkendali", "bg-cg", "text-cg"],
  mendekati: ["Pengeluaran mulai mendekati batas", "bg-amber-400", "text-amber-400"],
  hampir_habis: ["Anggaran hampir habis", "bg-orange-400", "text-orange-400"],
  terlampaui: ["Anggaran telah terlampaui", "bg-red-400", "text-red-400"],
} as const;
const label = (key: string) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" }); };

export default function BudgetClient({ month, items, cats, cn, history, exceeded }: Props) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const ed = items.find((i) => i.id === editId) ?? null;
  const [amt, setAmt] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(i: Item) { setEditId(i.id); setAmt(i.amount.toLocaleString("id-ID")); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancel() { setEditId(null); setAmt(""); setMsg(null); }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(null);
    const form = e.currentTarget, f = new FormData(form);
    const name = String(f.get("name")).trim(), amount = parseInt(amt.replace(/\D/g, ""), 10);
    if (!name) return setMsg({ ok: false, t: "Nama anggaran wajib diisi." });
    if (!amount || amount <= 0) return setMsg({ ok: false, t: "Nominal harus lebih dari Rp0." });
    const [y, m] = month.split("-").map(Number);
    const row = { name, year: y, month: m, category_id: String(f.get("category_id")) || null, amount, notes: String(f.get("notes")).trim() || null };
    setBusy(true);
    const sb = createClient();
    const { error } = editId ? await sb.from("budgets").update(row).eq("id", editId) : await sb.from("budgets").insert(row);
    setBusy(false);
    if (error) return setMsg({ ok: false, t: error.code === "23505" ? "Anggaran untuk kategori dan bulan ini sudah ada." : "Gagal menyimpan: " + error.message });
    form.reset(); cancel(); setMsg({ ok: true, t: "Anggaran berhasil disimpan." }); router.refresh();
  }
  async function del(i: Item) {
    if (!confirm(`Hapus anggaran "${i.name}"? Transaksi tidak ikut terhapus.`)) return;
    const { error } = await createClient().from("budgets").delete().eq("id", i.id);
    if (error) return alert("Gagal menghapus: " + error.message);
    router.refresh();
  }

  const inp = "w-full rounded-lg border border-line bg-rich px-3 py-2.5 text-sm outline-none focus:border-cg";
  const lab = "mb-1.5 block text-xs font-semibold text-mut";
  return (
    <>
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-mut">Periode</label>
        <input type="month" value={month} onChange={(e) => e.target.value && router.push(`/anggaran?m=${e.target.value}`)} className="rounded-lg border border-line bg-rich px-3 py-2 text-sm outline-none focus:border-cg" />
        <span className="text-sm text-mut">{label(month)}</span>
      </div>

      <form key={editId ?? "baru"} onSubmit={save} className="grid gap-4 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">{ed ? "Ubah Anggaran" : "Buat Anggaran"} · {label(month)}</h2>
        <div><label className={lab}>Nama Anggaran</label><input name="name" maxLength={60} defaultValue={ed?.name} placeholder="Contoh: Jatah makan" className={inp} /></div>
        <div><label className={lab}>Nominal Anggaran</label><input inputMode="numeric" value={amt} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 13); setAmt(d ? Number(d).toLocaleString("id-ID") : ""); }} placeholder="Rp0" className={inp} /></div>
        <div><label className={lab}>Kategori yang dibatasi</label><select name="category_id" defaultValue={ed?.category_id ?? ""} className={inp}><option value="">Semua pengeluaran (anggaran keseluruhan)</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className={lab}>Catatan (opsional)</label><input name="notes" maxLength={120} defaultValue={ed?.notes ?? ""} className={inp} /></div>
        {msg && <p className={`text-sm sm:col-span-2 ${msg.ok ? "text-cg" : "text-red-400"}`}>{msg.t}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button disabled={busy} className="rounded-lg bg-bd px-5 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60">{busy ? "Menyimpan…" : ed ? "Simpan Perubahan" : "Simpan Anggaran"}</button>
          {ed && <button type="button" onClick={cancel} className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-mut hover:text-white">Batal</button>}
        </div>
      </form>

      {!items.length ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-mut">Belum ada anggaran untuk {label(month)}. Buat anggaran pertamamu lewat formulir di atas.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((i) => {
            const [txt, bar, col] = ST[i.status];
            return (
              <div key={i.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate font-bold">{i.name}</div><div className="text-xs text-mut">{i.category_id ? cn[i.category_id] ?? "Kategori" : "Semua pengeluaran"}</div></div>
                  <span className="flex shrink-0 gap-1">
                    <button onClick={() => startEdit(i)} title="Ubah" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"><Pencil size={15} /></button>
                    <button onClick={() => del(i)} title="Hapus" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-red-400"><Trash2 size={15} /></button>
                  </span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${Math.min(100, i.pct)}%` }} /></div>
                <div className="mt-2 flex justify-between text-sm"><span className={`font-semibold ${col}`}>{txt}</span><span className="font-bold tabular-nums">{Math.round(i.pct)}%</span></div>
                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-mut">Anggaran</dt><dd className="text-right tabular-nums">{rupiah(i.amount)}</dd>
                  <dt className="text-mut">Terpakai</dt><dd className="text-right tabular-nums">{rupiah(i.spent)}</dd>
                  <dt className="text-mut">{i.remaining < 0 ? "Kelebihan" : "Sisa"}</dt><dd className={`text-right font-semibold tabular-nums ${i.remaining < 0 ? "text-red-400" : "text-cg"}`}>{rupiah(Math.abs(i.remaining))}</dd>
                  <dt className="text-mut">Transaksi</dt><dd className="text-right tabular-nums">{i.count}</dd>
                </dl>
                {i.notes && <p className="mt-2 text-xs text-mut">{i.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-1 font-bold">Riwayat Anggaran</h2>
          <p className="mb-4 text-xs text-mut">Anggaran vs realisasi pengeluaran per bulan. Bulan dengan anggaran keseluruhan memakai angka itu, selain itu dijumlahkan dari anggaran kategori.</p>
          <div className="space-y-4">
            {history.map((h) => { const p = h.budget > 0 ? (h.spent / h.budget) * 100 : 0; return (
              <div key={h.key}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{label(h.key)}</span><span className="text-mut tabular-nums">{rupiah(h.spent)} dari {rupiah(h.budget)} ({Math.round(p)}%)</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${p >= 100 ? "bg-red-400" : p >= 90 ? "bg-orange-400" : p >= 70 ? "bg-amber-400" : "bg-cg"}`} style={{ width: `${Math.min(100, p)}%` }} /></div>
              </div>); })}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-bold">Kategori yang paling sering melampaui anggaran</h3>
            {exceeded.length ? exceeded.map(([n, c]) => <div key={n} className="flex justify-between text-sm"><span>{n}</span><span className="text-red-400">{c} bulan</span></div>) : <p className="text-sm text-mut">Belum ada kategori yang melampaui anggaran.</p>}
          </div>
        </div>
      )}
    </>
  );
}