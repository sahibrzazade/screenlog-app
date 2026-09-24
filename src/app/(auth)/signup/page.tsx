"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { signup } from "@/app/(auth)/actions";

const SignupPage = () => {
  const [state, formAction, pending] = useActionState(signup, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {passwordsMismatch && (
            <p className="mt-1 text-xs text-destructive">Passwords don&apos;t match.</p>
          )}
        </div>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || passwordsMismatch}
          className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:text-accent-hover">
          Log in
        </Link>
      </p>
    </main>
  );
};

export default SignupPage;
