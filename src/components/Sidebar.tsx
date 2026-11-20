"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, History, Wallet, PiggyBank, ArrowLeftRight, Lightbulb, Settings, MoreHorizontal, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const items = [
  ["/dashboard", "Dashboard", "Beranda", LayoutDashboard],
  ["/pengeluaran", "Catat Pengeluaran", "Keluar", ArrowDownCircle],
  ["/pemasukan", "Catat Pemasukan", "Masuk", ArrowUpCircle],
  ["/riwayat", "Riwayat Transaksi", "Riwayat", History],
  ["/anggaran", "Anggaran Bulanan", "Anggaran", Wallet],
  ["/tabungan", "Target Tabungan", "Tabungan", PiggyBank],
  ["/perbandingan", "Perbandingan", "Banding", ArrowLeftRight],
  ["/analisis", "Financial Intelligence", "Analisis", Lightbulb],
  ["/pengaturan", "Pengaturan", "Pengaturan", Settings],
] as const;
const PRIMARY = 4;

export default function Sidebar({ name, email }: { name: string; email: string }) {
  const path = usePathname(), router = useRouter();
  const [more, setMore] = useState(false);
  async function logout() { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }
  const moreActive = items.slice(PRIMARY).some(([h]) => h === path);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r border-line bg-panel p-4 md:flex">
        <div className="px-2 pb-6 text-xl font-extrabold">Catet<span className="text-cg">Yuk</span></div>
        <nav className="flex-1 space-y-1">
          {items.map(([href, label, , Icon]) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${path === href ? "bg-dgreen text-white" : "text-mut hover:bg-dgreen/60 hover:text-white"}`}>
              <Icon size={18} />{label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-3">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="truncate text-xs text-mut">{email}</div>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-mut hover:text-white"><LogOut size={16} />Keluar Akun</button>
        </div>
      </aside>

      {more && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-14 grid grid-cols-3 gap-1 border-t border-line bg-panel p-3" onClick={(e) => e.stopPropagation()}>
            {items.slice(PRIMARY).map(([href, , short, Icon]) => (
              <Link key={href} href={href} onClick={() => setMore(false)} className={`flex flex-col items-center gap-1 rounded-lg py-3 text-[11px] font-semibold ${path === href ? "bg-dgreen text-cg" : "text-mut"}`}><Icon size={22} />{short}</Link>
            ))}
            <button onClick={logout} className="flex flex-col items-center gap-1 rounded-lg py-3 text-[11px] font-semibold text-mut"><LogOut size={22} />Logout</button>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-panel py-1.5 md:hidden">
        {items.slice(0, PRIMARY).map(([href, , short, Icon]) => (
          <Link key={href} href={href} onClick={() => setMore(false)} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${path === href ? "text-cg" : "text-mut"}`}><Icon size={20} />{short}</Link>
        ))}
        <button onClick={() => setMore(!more)} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${more || moreActive ? "text-cg" : "text-mut"}`}><MoreHorizontal size={20} />Lainnya</button>
      </nav>
    </>
  );
}