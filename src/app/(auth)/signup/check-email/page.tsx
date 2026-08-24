import Link from "next/link";

const CheckEmailPage = () => (
  <main>
    <h1>Check your email</h1>
    <p>
      If that email doesn&apos;t already have a screenlog account, we&apos;ve
      sent a confirmation link to it. Click it to activate your account, then{" "}
      <Link href="/login">log in</Link>. Already have an account with that
      email? Just <Link href="/login">log in</Link> instead.
    </p>
  </main>
);

export default CheckEmailPage;
