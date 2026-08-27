import Link from "next/link";

const CheckEmailPage = () => (
  <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-sm flex-col justify-center px-4 py-12 text-center">
    <h1 className="text-2xl font-semibold">Check your email</h1>
    <p className="mt-4 text-sm text-muted-foreground">
      If that email doesn&apos;t already have a screenlog account, we&apos;ve
      sent a confirmation link to it. Click it to activate your account, then{" "}
      <Link href="/login" className="text-accent hover:text-accent-hover">
        log in
      </Link>
      . Already have an account with that email? Just{" "}
      <Link href="/login" className="text-accent hover:text-accent-hover">
        log in
      </Link>{" "}
      instead.
    </p>
  </main>
);

export default CheckEmailPage;
