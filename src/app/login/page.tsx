"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Wallet, TrendingUp, ShieldCheck, PiggyBank, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const score = (p: string) => (p ? [p.length >= 8, /[a-z]/.test(p) && /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length : 0);
const LV = ["", "Lemah", "Cukup", "Kuat", "Sangat kuat"], LC = ["bg-line", "bg-red-400", "bg-amber-400", "bg-cg", "bg-emerald-400"];

function Field({ icon: I, right, ...p }: { icon: React.ElementType; right?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <I size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mut" />
      <input {...p} className="w-full rounded-xl border border-line bg-rich py-3 pl-10 pr-11 text-sm outline-none transition focus:border-cg" />
      {right}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [daftar, setDaftar] = useState(false), [loading, setLoading] = useState(false), [show, setShow] = useState(false);
  const [pw, setPw] = useState(""), [email, setEmail] = useState("");
  const [pesan, setPesan] = useState<{ ok: boolean; t: string } | null>(null);
  const sc = score(pw);
  const eye = (
    <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-mut transition hover:text-white">
      {show ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPesan(null);
    const f = new FormData(e.currentTarget);
    if (daftar) {
      if (pw.length < 8) return setPesan({ ok: false, t: "Password minimal 8 karakter." });
      if (pw !== f.get("konfirmasi")) return setPesan({ ok: false, t: "Konfirmasi password tidak sama." });
    }
    setLoading(true);
    const sb = createClient(), em = email.trim();
    const { data, error } = daftar
      ? await sb.auth.signUp({ email: em, password: pw, options: { data: { full_name: String(f.get("nama")).trim() } } })
      : await sb.auth.signInWithPassword({ email: em, password: pw });
    setLoading(false);
    if (error) return setPesan({ ok: false, t: daftar ? "Pendaftaran gagal: " + error.message : "Email atau password salah." });
    if (daftar && !data.session) return setPesan({ ok: true, t: "Akun dibuat. Cek email untuk verifikasi, lalu masuk." });
    router.push("/dashboard"); router.refresh();
  }
  async function lupa() {
    if (!email.trim()) return setPesan({ ok: false, t: "Isi email dulu, lalu klik Lupa password." });
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/pengaturan` });
    setPesan(error ? { ok: false, t: "Gagal mengirim: " + error.message } : { ok: true, t: "Tautan reset password dikirim. Cek email-mu." });
  }
  const mode = (d: boolean) => { setDaftar(d); setPesan(null); };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-bd via-[#0B3D2E] to-[#04251A] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="floaty absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cg/20 blur-3xl" />
        <div className="floaty absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" style={{ animationDelay: "-3s" }} />
        <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur"><Wallet size={22} /></div><span className="text-2xl font-extrabold tracking-tight">Catet<span className="text-cg">Yuk</span></span></div>
        <div className="relative max-w-md">
          <h1 className="fade-up text-4xl font-extrabold leading-tight">Keuangan pribadi yang rapi, tanpa ribet.</h1>
          <p className="fade-up mt-3 text-white/70" style={{ animationDelay: ".1s" }}>Catat, pantau, dan rencanakan uangmu di satu tempat.</p>
          <ul className="mt-8 space-y-4">
            {([[TrendingUp, "Pantau arus kas", "Grafik dan analisis dari catatanmu sendiri."], [PiggyBank, "Capai target tabungan", "Anggaran dan tabungan yang saling terhubung."], [ShieldCheck, "Data terlindungi", "Setiap akun hanya bisa melihat datanya sendiri."]] as const).map(([I, t, d], i) => (
              <li key={t} className="fade-up flex gap-3" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"><I size={19} className="text-cg" /></div>
                <div><div className="font-semibold">{t}</div><div className="text-sm text-white/65">{d}</div></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© CatetYuk | created by rnaufal</p>
      </section>

      <section className="grid place-items-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-bd to-cg text-white"><Wallet size={19} /></div><span className="text-xl font-extrabold">Catet<span className="text-cg">Yuk</span></span></div>
          <div className="relative mb-6 grid grid-cols-2 rounded-xl border border-line bg-panel p-1 text-sm font-semibold">
            <span className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-bd to-cg/80 transition-transform duration-300" style={{ transform: daftar ? "translateX(100%)" : "none" }} />
            <button type="button" onClick={() => mode(false)} className={`relative z-10 py-2 transition ${!daftar ? "text-white" : "text-mut"}`}>Masuk</button>
            <button type="button" onClick={() => mode(true)} className={`relative z-10 py-2 transition ${daftar ? "text-white" : "text-mut"}`}>Daftar</button>
          </div>
          <form key={String(daftar)} onSubmit={submit} className="fade-up space-y-3.5">
            <div><h2 className="text-2xl font-extrabold">{daftar ? "Buat akun baru" : "Selamat datang kembali"}</h2><p className="mt-1 text-sm text-mut">{daftar ? "Mulai catat keuanganmu hari ini." : "Masuk untuk melanjutkan."}</p></div>
            {daftar && <Field icon={User} name="nama" required placeholder="Nama Lengkap" autoComplete="name" />}
            <Field icon={Mail} name="email" type="email" required placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field icon={Lock} name="password" type={show ? "text" : "password"} required placeholder="Password" autoComplete={daftar ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} right={eye} />
            {daftar && pw && (
              <div>
                <div className="flex gap-1.5">{[1, 2, 3, 4].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= sc ? LC[sc] : "bg-line"}`} />)}</div>
                <div className="mt-1 text-xs text-mut">Kekuatan password: <b>{LV[sc] || "Terlalu lemah"}</b></div>
              </div>
            )}
            {daftar && <Field icon={Lock} name="konfirmasi" type={show ? "text" : "password"} required placeholder="Konfirmasi Password" autoComplete="new-password" />}
            {!daftar && <div className="text-right"><button type="button" onClick={lupa} className="text-xs font-semibold text-mut transition hover:text-cg">Lupa password?</button></div>}
            {pesan && <p className={`fade-up rounded-lg px-3 py-2 text-sm ${pesan.ok ? "bg-cg/10 text-cg" : "bg-red-400/10 text-red-400"}`}>{pesan.t}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-bd py-3 font-semibold text-white disabled:opacity-60">{loading && <Loader2 size={17} className="animate-spin" />}{loading ? "Memproses…" : daftar ? "Daftar" : "Masuk"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}