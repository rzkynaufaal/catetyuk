"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, History, Wallet, PiggyBank, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const items = [
  ["/dashboard", "Dashboard", "Beranda", LayoutDashboard],
  ["/pengeluaran", "Catat Pengeluaran", "Keluar", ArrowDownCircle],
  ["/pemasukan", "Catat Pemasukan", "Masuk", ArrowUpCircle],
  ["/riwayat", "Riwayat Transaksi", "Riwayat", History],
  ["/anggaran", "Anggaran Bulanan", "Anggaran", Wallet],
  ["/tabungan", "Target Tabungan", "Tabung", PiggyBank],
] as const;

export default function Sidebar({ name, email }: { name: string; email: string }) {
  const path = usePathname(), router = useRouter();
  async function logout() { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-panel p-4 md:flex">
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
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-panel py-1.5 md:hidden">
        {items.map(([href, , short, Icon]) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold ${path === href ? "text-cg" : "text-mut"}`}><Icon size={20} />{short}</Link>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-0.5 px-1.5 py-1 text-[10px] font-semibold text-mut"><LogOut size={20} />Logout</button>
      </nav>
    </>
  );
}