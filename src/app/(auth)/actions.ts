"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validation/username";

export type AuthFormState = { error: string } | undefined;

export const signup = async (
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const parsedUsername = usernameSchema.safeParse({
    username: formData.get("username"),
  });

  if (!parsedUsername.success) {
    return { error: parsedUsername.error.issues[0].message };
  }

  const { username } = parsedUsername.data;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles_public")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return { error: "That username is already taken." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase silently no-ops (no error, empty identities) instead of
  // erroring when the email already belongs to a confirmed account
  // (e.g. signed up via Google). We redirect the same way either way —
  // showing a distinct error here would leak which emails are registered.
  redirect("/signup/check-email");
};

export const login = async (
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // A `redirect()` thrown inside a Server Action is resolved without a
  // fresh top-level request, so the proxy's username gate never runs for
  // its target. Check here instead of relying on the proxy to catch it.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .single();

  redirect(profile?.username ? "/" : "/choose-username");
};

export const loginWithGoogle = async () => {
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect("/login");
  }

  redirect(data.url);
};

export const logout = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
};
