import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminUsers from "@/components/AdminUsers";

export const metadata = { title: "Admin · Cignal System" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // Admin gate — enforced here AND by RLS on the data itself.
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");

  // RLS lets an admin read every row; a non-admin would only ever see their own.
  const { data: users } = await supabase
    .from("profiles")
    .select("id,email,full_name,company,tier,status,is_admin,created_at")
    .order("created_at", { ascending: false });

  return <AdminUsers initialUsers={users || []} />;
}
