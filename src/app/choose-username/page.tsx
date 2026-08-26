import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsernameForm } from "@/components/username-form";

const ChooseUsernamePage = async () => {
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

  if (profile?.username) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold">Choose a username</h1>
      <p className="mt-2 text-muted-foreground">
        Pick a username to finish setting up your account.
      </p>
      <div className="mt-4">
        <UsernameForm variant="choose" />
      </div>
    </main>
  );
};

export default ChooseUsernamePage;
