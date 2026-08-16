"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, loginWithGoogle } from "@/app/(auth)/actions";

const LoginPage = () => {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main>
      <h1>Log in</h1>
      <form action={formAction}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="border border-neutral-400 rounded bg-white px-3 py-1.5 text-neutral-900"
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
            className="border border-neutral-400 rounded bg-white px-3 py-1.5 text-neutral-900"
          />
        </div>
        {state?.error && <p role="alert">{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>
      <form action={loginWithGoogle}>
        <button type="submit">Continue with Google</button>
      </form>
      <p>
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
};

export default LoginPage;
