"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/(auth)/actions";

const SignupPage = () => {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <main>
      <h1>Sign up</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        {state?.error && <p role="alert">{state.error}</p>}
        <button type="submit" disabled={pending} className="cursor-pointer disabled:cursor-not-allowed">
          {pending ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
};

export default SignupPage;
