import { loadAll } from "@/lib/data";
import SettingsClient from "@/components/SettingsClient";

export default async function PengaturanPage() {
  const { user, cats } = await loadAll();
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <div><h1 className="text-2xl font-extrabold">Pengaturan</h1><p className="text-sm text-mut">Kelola profil, keamanan, dan kategori.</p></div>
      <SettingsClient name={(user.user_metadata?.full_name as string | undefined) ?? ""} email={user.email ?? ""} cats={cats} />
    </main>
  );
}