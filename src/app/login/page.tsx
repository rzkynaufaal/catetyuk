"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [daftar, setDaftar] = useState(false);
  const [pesan, setPesan] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPesan("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim(), password = String(f.get("password"));
    if (daftar) {
      if (password.length < 8) return setPesan("Password minimal 8 karakter.");
      if (password !== f.get("konfirmasi")) return setPesan("Konfirmasi password tidak sama.");
    }
    setLoading(true);
    const sb = createClient();
    const { data, error } = daftar
      ? await sb.auth.signUp({ email, password, options: { data: { full_name: String(f.get("nama")).trim() } } })
      : await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setPesan(daftar ? "Pendaftaran gagal: " + error.message : "Email atau password salah.");
    if (daftar && !data.session) return setPesan("Akun dibuat. Cek email untuk verifikasi, lalu masuk.");
    router.push("/dashboard"); router.refresh();
  }
  const inp = "w-full rounded-lg border border-line bg-rich px-3 py-2.5 text-sm outline-none focus:border-cg";
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-panel p-7">
        <h1 className="text-2xl font-extrabold">Catet<span className="text-cg">Yuk</span></h1>
        <p className="text-sm text-mut">{daftar ? "Buat akun untuk mulai mencatat." : "Masuk untuk melanjutkan."}</p>
        {daftar && <input name="nama" required placeholder="Nama Lengkap" className={inp} />}
        <input name="email" type="email" required placeholder="Email" className={inp} />
        <input name="password" type="password" required placeholder="Password" className={inp} />
        {daftar && <input name="konfirmasi" type="password" required placeholder="Konfirmasi Password" className={inp} />}
        {pesan && <p className="text-sm text-red-400">{pesan}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-bd py-2.5 font-semibold hover:brightness-110 disabled:opacity-60">{loading ? "Memproses…" : daftar ? "Daftar" : "Masuk"}</button>
        <button type="button" onClick={() => { setDaftar(!daftar); setPesan(""); }} className="w-full text-sm text-mut hover:text-white">{daftar ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</button>
      </form>
    </main>
  );
}
