import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UsernameForm } from "@/components/username-form";
import { ShowcaseEditor } from "@/components/showcase-editor";
import { NowWatchingPicker } from "@/components/now-watching-picker";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getShowcase, resolveShowcaseItems } from "@/lib/showcase";
import { updateTopMovies, updateTopShows } from "@/app/settings/actions";

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

  const showcase = await getShowcase(supabase, user.id);
  const showcaseItems = await resolveShowcaseItems(showcase);
  const hasPassword = user.identities?.some((identity) => identity.provider === "email") ?? false;

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="mt-4">
        <UsernameForm
          variant="settings"
          defaultUsername={profile?.username ?? undefined}
        />
      </div>

      <section className="mt-8 flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Profile showcase</h2>
        <ShowcaseEditor
          mediaType="movie"
          label="Top 4 movies"
          initialItems={showcaseItems.topMovies}
          action={updateTopMovies}
        />
        <ShowcaseEditor
          mediaType="tv"
          label="Top 4 shows"
          initialItems={showcaseItems.topShows}
          action={updateTopShows}
        />
        <NowWatchingPicker initialItem={showcaseItems.nowWatching} />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Password</h2>
        {hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            You signed in with Google, so there&apos;s no password to change here.
          </p>
        )}
      </section>
    </main>
  );
};

export default SettingsPage;
