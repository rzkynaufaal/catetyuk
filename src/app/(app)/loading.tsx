// Skeleton otomatis tampil di semua halaman saat data dimuat
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="skel h-8 w-72 max-w-full rounded-lg" />
      <div className="skel h-4 w-96 max-w-full rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-28 rounded-2xl" />)}</div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]"><div className="skel h-64 rounded-2xl" /><div className="skel h-64 rounded-2xl" /></div>
    </main>
  );
}