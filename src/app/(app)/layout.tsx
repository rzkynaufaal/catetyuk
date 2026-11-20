import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const name = (user.user_metadata?.full_name as string | undefined) || "Pengguna";
  return (
    <div>
      <Sidebar name={name} email={user.email ?? ""} />
      <div className="pb-20 md:ml-60 md:pb-0">{children}</div>
    </div>
  );
}