"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string } | undefined;

export const signup = async (
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/signup/check-email");
};

export const login = async (
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
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
