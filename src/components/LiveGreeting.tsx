"use client";
import { useEffect, useState } from "react";
export default function LiveGreeting({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const f = (o: Intl.DateTimeFormatOptions) => (now ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...o }).format(now) : "");
  const h = now ? parseInt(f({ hour: "2-digit", hour12: false }), 10) : 12;
  const sapa = h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Halo, selamat datang kembali, {name}! 👋</h1>
      <p className="mt-1 text-sm text-mut">
        {sapa} · <span suppressHydrationWarning>{f({ weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span> ·{" "}
        <span className="font-semibold text-cg tabular-nums" suppressHydrationWarning>{f({ hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/\./g, ":")} WIB</span>
      </p>
    </div>
  );
}
