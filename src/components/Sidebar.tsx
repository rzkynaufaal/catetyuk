"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, History, Wallet, PiggyBank, ArrowLeftRight, Lightbulb, Settings, MoreHorizontal, LogOut, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = [href: string, label: string, short: string, Icon: LucideIcon];
const groups: [string, Item[]][] = [
  ["Utama", [["/dashboard", "Dashboard", "Beranda", LayoutDashboard]]],
  ["Transaksi", [["/pengeluaran", "Catat Pengeluaran", "Keluar", ArrowDownCircle], ["/pemasukan", "Catat Pemasukan", "Masuk", ArrowUpCircle], ["/riwayat", "Riwayat Transaksi", "Riwayat", History]]],
  ["Rencana", [["/anggaran", "Anggaran Bulanan", "Anggaran", Wallet], ["/tabungan", "Target Tabungan", "Tabungan", PiggyBank]]],
  ["Wawasan", [["/perbandingan", "Perbandingan", "Banding", ArrowLeftRight], ["/analisis", "Financial Intelligence", "Analisis", Lightbulb]]],
  ["Akun", [["/pengaturan", "Pengaturan", "Pengaturan", Settings]]],
];
const flat = groups.flatMap((g) => g[1]);
const PRIMARY = 4;

export default function Sidebar({ name, email }: { name: string; email: string }) {
  const path = usePathname(), router = useRouter();
  const [more, setMore] = useState(false);
  async function logout() { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";
  const moreActive = flat.slice(PRIMARY).some(([h]) => h === path);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r border-line bg-panel/90 p-4 backdrop-blur md:flex">
        <div className="mb-5 flex items-center gap-2.5 px-1">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-bd to-cg text-white shadow-lg"><Wallet size={19} /></div>
          <div className="text-xl font-extrabold tracking-tight">Catet<span className="text-cg">Yuk</span></div>
        </div>
        <nav className="flex-1 space-y-4">
          {groups.map(([title, items]) => (
            <div key={title}>
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-mut/70">{title}</div>
              <div className="space-y-0.5">
                {items.map(([href, label, , Icon]) => {
                  const on = path === href;
                  return (
                    <Link key={href} href={href} className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${on ? "bg-gradient-to-r from-bd/30 to-transparent text-white" : "text-mut hover:translate-x-0.5 hover:bg-dgreen/70 hover:text-white"}`} style={on ? { boxShadow: "inset 0 0 0 1px rgb(var(--c-cg) / .25)" } : undefined}>
                      {on && <span className="absolute -left-4 bottom-2 top-2 w-1 rounded-r-full bg-cg" style={{ boxShadow: "0 0 12px rgb(var(--c-cg))" }} />}
                      <Icon size={18} className={`transition-transform duration-200 group-hover:scale-110 ${on ? "text-cg" : ""}`} />{label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl border border-line bg-rich/60 p-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-bd to-cg text-xs font-extrabold text-white">{initials}</div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{name}</div><div className="truncate text-[11px] text-mut">{email}</div></div>
          </div>
          <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-xs font-semibold text-mut transition hover:border-red-400 hover:text-red-400"><LogOut size={14} />Keluar Akun</button>
        </div>
      </aside>

      {more && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMore(false)}>
          <div className="sheet-in absolute inset-x-0 bottom-16 grid grid-cols-3 gap-1.5 rounded-t-3xl border-t border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
            {flat.slice(PRIMARY).map(([href, , short, Icon]) => (
              <Link key={href} href={href} onClick={() => setMore(false)} className={`flex flex-col items-center gap-1.5 rounded-xl py-3.5 text-[11px] font-semibold transition active:scale-95 ${path === href ? "bg-dgreen text-cg" : "text-mut"}`}><Icon size={22} />{short}</Link>
            ))}
            <button onClick={logout} className="flex flex-col items-center gap-1.5 rounded-xl py-3.5 text-[11px] font-semibold text-red-400 transition active:scale-95"><LogOut size={22} />Logout</button>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-panel/95 py-1.5 backdrop-blur md:hidden">
        {flat.slice(0, PRIMARY).map(([href, , short, Icon]) => (
          <Link key={href} href={href} onClick={() => setMore(false)} className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition active:scale-90 ${path === href ? "text-cg" : "text-mut"}`}>
            {path === href && <span className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-cg" />}<Icon size={20} />{short}
          </Link>
        ))}
        <button onClick={() => setMore(!more)} className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold transition active:scale-90 ${more || moreActive ? "text-cg" : "text-mut"}`}>
          {moreActive && <span className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-cg" />}<MoreHorizontal size={20} />Lainnya
        </button>
      </nav>
    </>
  );
}