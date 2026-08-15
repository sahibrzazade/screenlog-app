import Link from "next/link";

const CheckEmailPage = () => (
  <main>
    <h1>Check your email</h1>
    <p>
      We sent a confirmation link to the address you signed up with. Click it
      to activate your account, then{" "}
      <Link href="/login">log in</Link>.
    </p>
  </main>
);

export default CheckEmailPage;
