import Link from "next/link";

type SignInPromptProps = {
  message?: string;
};

export const SignInPrompt = ({ message = "Sign in to log this" }: SignInPromptProps) => (
  <div className="rounded-md border border-border p-4 text-sm">
    <p>{message}</p>
    <Link href="/login" className="mt-2 inline-block underline">
      Sign in
    </Link>
  </div>
);
