"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { todayWIB } from "@/lib/finance";

const PAY = ["Tunai", "Transfer Bank", "E-Wallet", "Kartu Debit", "Kartu Kredit", "QRIS", "Lainnya"];
type Tx = { id: string; name: string; amount: number; category_id: string | null; tx_date: string; payment_method: string; notes: string | null; proof_url: string | null };

const shrink = (f: File) => new Promise<Blob>((res, rej) => {
  const u = URL.createObjectURL(f), i = new Image();
  i.onload = () => {
    const k = Math.min(1, 1200 / Math.max(i.width, i.height)), c = document.createElement("canvas");
    c.width = Math.round(i.width * k); c.height = Math.round(i.height * k);
    c.getContext("2d")!.drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
    c.toBlob((b) => (b ? res(b) : rej(new Error("gagal"))), "image/jpeg", 0.8);
  };
  i.onerror = () => rej(new Error("gambar tidak terbaca")); i.src = u;
});

export default function TransactionForm({ type, categories, tx }: { type: "income" | "expense"; categories: { id: string; name: string }[]; tx: Tx | null }) {
  const router = useRouter(), o = type === "expense";
  const [amt, setAmt] = useState(tx ? tx.amount.toLocaleString("id-ID") : "");
  const [file, setFile] = useState<File | null>(null);
  const [rm, setRm] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(null);
    const form = e.currentTarget, f = new FormData(form);
    const name = String(f.get("name")).trim(), amount = parseInt(amt.replace(/\D/g, ""), 10);
    if (!name) return setMsg({ ok: false, t: "Nama wajib diisi." });
    if (!amount || amount <= 0) return setMsg({ ok: false, t: "Nominal harus lebih dari Rp0." });
    if (!f.get("tx_date")) return setMsg({ ok: false, t: "Tanggal wajib diisi." });
    setBusy(true);
    const sb = createClient();
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push("/login"); return; }
      let proof = rm ? null : tx?.proof_url ?? null;
      if (file) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("proofs").upload(path, await shrink(file), { contentType: "image/jpeg" });
        if (error) throw error;
        if (tx?.proof_url) await sb.storage.from("proofs").remove([tx.proof_url]);
        proof = path;
      } else if (rm && tx?.proof_url) await sb.storage.from("proofs").remove([tx.proof_url]);
      const row = { name, amount, type, category_id: String(f.get("category_id")) || null, tx_date: String(f.get("tx_date")), payment_method: String(f.get("payment_method")), notes: String(f.get("notes")).trim() || null, proof_url: proof };
      const { error } = tx ? await sb.from("transactions").update(row).eq("id", tx.id) : await sb.from("transactions").insert(row);
      if (error) throw error;
      if (tx) { router.push("/riwayat"); router.refresh(); return; }
      form.reset(); setAmt(""); setFile(null); setMsg({ ok: true, t: "Transaksi berhasil disimpan." }); router.refresh();
    } catch (err) {
      setMsg({ ok: false, t: "Gagal menyimpan: " + (err instanceof Error ? err.message : "terjadi kesalahan") });
    } finally { setBusy(false); }
  }

  const inp = "w-full rounded-lg border border-line bg-rich px-3 py-2.5 text-sm outline-none focus:border-cg";
  const lab = "mb-1.5 block text-xs font-semibold text-mut";
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-line bg-panel p-6 sm:grid-cols-2">
      <div><label className={lab}>{o ? "Nama Pengeluaran" : "Sumber Pemasukan"}</label><input name="name" maxLength={80} defaultValue={tx?.name} placeholder={o ? "Contoh: Makan siang" : "Contoh: Gaji bulanan"} className={inp} /></div>
      <div><label className={lab}>{o ? "Nominal Pengeluaran" : "Nominal Pemasukan"}</label><input inputMode="numeric" value={amt} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 13); setAmt(d ? Number(d).toLocaleString("id-ID") : ""); }} placeholder="Rp0" className={inp} /></div>
      <div><label className={lab}>Kategori</label><select name="category_id" defaultValue={tx?.category_id ?? ""} className={inp}><option value="">Tanpa kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label className={lab}>Tanggal Transaksi</label><input type="date" name="tx_date" defaultValue={tx?.tx_date ?? todayWIB()} className={inp} /></div>
      <div><label className={lab}>{o ? "Metode Pembayaran" : "Metode Penerimaan"}</label><select name="payment_method" defaultValue={tx?.payment_method ?? "Tunai"} className={inp}>{PAY.map((p) => <option key={p}>{p}</option>)}</select></div>
      <div><label className={lab}>Bukti Transaksi (opsional, gambar)</label>
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 8 * 1024 * 1024) { setMsg({ ok: false, t: "Ukuran gambar maksimal 8 MB." }); e.target.value = ""; return; } setFile(f); setRm(false); }} className={inp} />
        {tx?.proof_url && !file && <label className="mt-2 flex items-center gap-2 text-xs text-mut"><input type="checkbox" checked={rm} onChange={(e) => setRm(e.target.checked)} />Bukti terlampir. Centang untuk menghapus.</label>}
      </div>
      <div className="sm:col-span-2"><label className={lab}>Catatan Tambahan (opsional)</label><textarea name="notes" rows={2} maxLength={200} defaultValue={tx?.notes ?? ""} className={inp} /></div>
      {msg && <p className={`text-sm sm:col-span-2 ${msg.ok ? "text-cg" : "text-red-400"}`}>{msg.t}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button disabled={busy} className="rounded-lg bg-bd px-5 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60">{busy ? "Menyimpan…" : tx ? "Simpan Perubahan" : "Simpan Transaksi"}</button>
        {tx && <button type="button" onClick={() => router.push("/riwayat")} className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-mut hover:text-white">Batal</button>}
      </div>
    </form>
  );
}