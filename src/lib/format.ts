export const pc = (n: number) => Math.abs(n).toFixed(1).replace(".", ",") + "%";
export const fd = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
export const fdr = (r: { from: string; to: string }) => (r.from === r.to ? fd(r.from) : `${fd(r.from)} – ${fd(r.to)}`);