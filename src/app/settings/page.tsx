import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsernameForm } from "@/components/username-form";

const SettingsPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-4">
        <UsernameForm
          variant="settings"
          defaultUsername={profile?.username ?? undefined}
        />
      </div>
    </main>
  );
};

export default SettingsPage;
