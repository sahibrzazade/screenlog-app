"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateUsername,
  type UpdateUsernameState,
} from "@/lib/actions/username";

type UsernameFormProps = {
  defaultUsername?: string;
  variant: "settings" | "choose";
};

export const UsernameForm = ({
  defaultUsername,
  variant,
}: UsernameFormProps) => {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UpdateUsernameState,
    FormData
  >(updateUsername, {});
  const handledSuccessRef = useRef(false);

  useEffect(() => {
    if (!state.success || handledSuccessRef.current) return;
    handledSuccessRef.current = true;

    if (variant === "settings") {
      toast.success("Username updated");
    } else {
      router.push("/");
    }
  }, [state, variant, router]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
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
          defaultValue={defaultUsername}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer self-start rounded-md border border-border px-4 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving..." : variant === "settings" ? "Save" : "Continue"}
      </button>
    </form>
  );
};
