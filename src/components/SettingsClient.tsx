"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Cat } from "@/lib/data";

const ICONS = ["🍽️", "🚗", "🎓", "💊", "🛍️", "🎮", "💡", "🏠", "🧴", "💰", "💼", "🎁", "📈", "📦"];
type Msg = Record<string, { ok: boolean; t: string } | undefined>;

export default function SettingsClient({ name, email, cats }: { name: string; email: string; cats: Cat[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>({});
  const say = (k: string, ok: boolean, t: string) => setMsg((m) => ({ ...m, [k]: { ok, t } }));
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState(""), [editIcon, setEditIcon] = useState("");

  async function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = String(new FormData(e.currentTarget).get("name")).trim();
    if (!n) return say("name", false, "Nama tidak boleh kosong.");
    const { error } = await createClient().auth.updateUser({ data: { full_name: n } });
    if (error) return say("name", false, "Gagal menyimpan: " + error.message);
    say("name", true, "Nama berhasil diperbarui."); router.refresh();
  }
  async function saveEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("email")).trim();
    if (!v || v === email) return say("email", false, "Masukkan email baru yang berbeda.");
    const { error } = await createClient().auth.updateUser({ email: v });
    if (error) return say("email", false, "Gagal mengubah email: " + error.message);
    say("email", true, "Permintaan diterima. Cek kotak masuk email untuk verifikasi (mungkin di email lama dan baru).");
  }
  async function savePass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form), p = String(f.get("p"));
    if (p.length < 8) return say("pass", false, "Password minimal 8 karakter.");
    if (p !== f.get("c")) return say("pass", false, "Konfirmasi password tidak sama.");
    const { error } = await createClient().auth.updateUser({ password: p });
    if (error) return say("pass", false, "Gagal mengubah password: " + error.message);
    form.reset(); say("pass", true, "Password berhasil diubah.");
  }
  async function addCat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form), n = String(f.get("n")).trim();
    if (!n) return say("cat", false, "Nama kategori wajib diisi.");
    const { error } = await createClient().from("categories").insert({ name: n, type: String(f.get("t")), icon: String(f.get("i")) || null });
    if (error) return say("cat", false, error.code === "23505" ? "Kategori dengan nama itu sudah ada." : "Gagal menambah: " + error.message);
    form.reset(); say("cat", true, "Kategori ditambahkan."); router.refresh();
  }
  async function updCat(id: string) {
    const n = editName.trim();
    if (!n) return say("cat", false, "Nama kategori wajib diisi.");
    const { error } = await createClient().from("categories").update({ name: n, icon: editIcon || null }).eq("id", id);
    if (error) return say("cat", false, error.code === "23505" ? "Kategori dengan nama itu sudah ada." : "Gagal menyimpan: " + error.message);
    setEditId(null); say("cat", true, "Kategori diperbarui."); router.refresh();
  }
  async function delCat(c: Cat) {
    if (!confirm(`Hapus kategori "${c.name}"? Anggaran untuk kategori ini ikut terhapus.`)) return;
    const { error } = await createClient().from("categories").delete().eq("id", c.id);
    if (error) return say("cat", false, error.code === "23503" ? `Kategori "${c.name}" masih dipakai transaksi. Ubah atau hapus transaksinya terlebih dahulu.` : "Gagal menghapus: " + error.message);
    say("cat", true, "Kategori dihapus."); router.refresh();
  }

  const inp = "w-full rounded-lg border border-line bg-rich px-3 py-2.5 text-sm outline-none focus:border-cg";
  const lab = "mb-1.5 block text-xs font-semibold text-mut";
  const btn = "rounded-lg bg-bd px-4 py-2.5 text-sm font-semibold hover:brightness-110";
  const box = "rounded-2xl border border-line bg-panel p-5";
  const M = ({ k }: { k: string }) => (msg[k] ? <p className={`text-sm ${msg[k]!.ok ? "text-cg" : "text-red-400"}`}>{msg[k]!.t}</p> : null);

  return (
    <>
      <section className={`${box} space-y-4`}>
        <h2 className="font-bold">Profil</h2>
        <form onSubmit={saveName} className="flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><label className={lab}>Nama Lengkap</label><input name="name" defaultValue={name} maxLength={60} className={inp} /></div><button className={btn}>Simpan Nama</button></form><M k="name" />
        <form onSubmit={saveEmail} className="flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1"><label className={lab}>Email (perlu verifikasi)</label><input name="email" type="email" defaultValue={email} className={inp} /></div><button className={btn}>Ubah Email</button></form><M k="email" />
      </section>
      <section className={`${box} space-y-4`}>
        <h2 className="font-bold">Ganti Password</h2>
        <form onSubmit={savePass} className="grid gap-3 sm:grid-cols-2"><div><label className={lab}>Password baru</label><input name="p" type="password" className={inp} /></div><div><label className={lab}>Konfirmasi password</label><input name="c" type="password" className={inp} /></div><div className="sm:col-span-2"><button className={btn}>Ubah Password</button></div></form><M k="pass" />
      </section>
      <section className={`${box} space-y-4`}>
        <h2 className="font-bold">Kategori</h2>
        <form onSubmit={addCat} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-end">
          <div><label className={lab}>Jenis</label><select name="t" className={inp}><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></div>
          <div><label className={lab}>Nama kategori baru</label><input name="n" maxLength={40} className={inp} /></div>
          <div><label className={lab}>Ikon</label><select name="i" className={inp}><option value="">—</option>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></div>
          <button className={btn}>Tambah</button>
        </form><M k="cat" />
        {(["expense", "income"] as const).map((t) => (
          <div key={t}><h3 className="mb-2 text-sm font-bold text-mut">{t === "expense" ? "Kategori Pengeluaran" : "Kategori Pemasukan"}</h3>
            <div className="divide-y divide-line/60">{cats.filter((c) => c.type === t).map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-2">
                {editId === c.id ? (<>
                  <select value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-16 rounded-lg border border-line bg-rich px-2 py-1.5 text-sm"><option value="">—</option>{ICONS.map((i) => <option key={i}>{i}</option>)}</select>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} className="min-w-0 flex-1 rounded-lg border border-line bg-rich px-3 py-1.5 text-sm outline-none focus:border-cg" />
                  <button onClick={() => updCat(c.id)} className="rounded-lg bg-bd px-3 py-1.5 text-sm font-semibold">Simpan</button>
                  <button onClick={() => setEditId(null)} className="px-2 text-sm text-mut hover:text-white">Batal</button>
                </>) : (<>
                  <span className="w-6 text-center">{c.icon ?? "•"}</span><span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <button onClick={() => { setEditId(c.id); setEditName(c.name); setEditIcon(c.icon ?? ""); }} title="Ubah" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"><Pencil size={15} /></button>
                  <button onClick={() => delCat(c)} title="Hapus" className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-red-400"><Trash2 size={15} /></button>
                </>)}
              </div>))}</div></div>
        ))}
      </section>
      <section className={`${box} space-y-2`}>
        <h2 className="font-bold">Data</h2>
        <p className="text-sm text-mut">Ekspor CSV, tinjau, dan hapus transaksi tersedia di halaman Riwayat Transaksi.</p>
        <Link href="/riwayat" className="inline-block rounded-lg border border-line px-4 py-2 text-sm font-semibold text-mut hover:text-white">Buka Riwayat Transaksi</Link>
      </section>
    </>
  );
}