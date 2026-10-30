"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { PasswordInput } from "@/components/password-input";
import { login, loginWithGoogle } from "@/app/(auth)/actions";

export const LoginForm = () => {
  const [state, formAction, pending] = useActionState(login, undefined);

  // Submitting via onSubmit instead of <form action> because React resets a
  // form after its action runs — including on a failed login, which would
  // wipe what the user typed. Success redirects away, so no reset is needed.
  // method="post" matters: if the form is submitted before hydration, the
  // browser's native submit must never put the password in the URL (GET).
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <>
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form method="post" onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-border bg-surface px-4 py-2 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-md border border-transparent bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>
      <form action={loginWithGoogle} className="mt-6">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface"
        >
          <FcGoogle className="size-4.5" />
          Continue with Google
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent hover:text-accent-hover">
          Sign up
        </Link>
      </p>
    </>
  );
};
