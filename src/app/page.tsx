import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

const Home = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main>
      <h1>Screenlog</h1>
      {user ? (
        <>
          <p>Logged in as {user.email}</p>
          <p>
            <Link href="/profile">Profile</Link>
          </p>
          <p>
            <Link href="/settings">Settings</Link>
          </p>
          <form action={logout}>
            <button type="submit">Log out</button>
          </form>
        </>
      ) : (
        <p>
          <Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link>.
        </p>
      )}
    </main>
  );
};

export default Home;
