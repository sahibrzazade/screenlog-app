"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameSchema } from "@/lib/validation/username";
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
  const [username, setUsername] = useState(defaultUsername ?? "");
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState<{ username: string; available: boolean } | null>(
    null,
  );
  // On /settings there's already a saved username, so the field starts
  // disabled behind an Edit button. On /choose-username there's nothing to
  // edit yet, so it's always editable.
  const [isEditing, setIsEditing] = useState(variant === "choose");
  const inputRef = useRef<HTMLInputElement>(null);

  // Adjusting state when a prop/value changes, during render rather than in
  // an effect (https://react.dev/learn/you-might-not-need-an-effect): once
  // the save succeeds, drop back out of edit mode. The condition itself
  // (isEditing) turns false as soon as this runs, so it settles in one pass.
  if (state.success && variant === "settings" && isEditing) {
    setIsEditing(false);
  }

  useEffect(() => {
    if (!state.success || handledSuccessRef.current) return;
    handledSuccessRef.current = true;

    if (variant === "settings") {
      toast.success("Username updated");
    } else {
      router.push("/");
    }
  }, [state, variant, router]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const trimmed = username.trim();
  const isUnchanged = trimmed === (defaultUsername ?? "");
  const isValidFormat = usernameSchema.safeParse({ username: trimmed }).success;

  // Live "is this username taken" check, debounced. Only ever informs the UI —
  // the server action's unique-constraint check is still the real gate.
  useEffect(() => {
    if (!isEditing || isUnchanged || !isValidFormat) return;

    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setIsChecking(true);
      const { data } = await supabase
        .from("profiles_public")
        .select("id")
        .eq("username", trimmed)
        .maybeSingle();
      setChecked({ username: trimmed, available: !data });
      setIsChecking(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [isEditing, trimmed, isUnchanged, isValidFormat]);

  const availability = isUnchanged
    ? null
    : !isValidFormat
      ? trimmed.length > 0
        ? "invalid"
        : null
      : isChecking
        ? "checking"
        : checked?.username === trimmed
          ? checked.available
            ? "available"
            : "taken"
          : null;

  const startEditing = () => setIsEditing(true);

  const cancelEditing = () => {
    setUsername(defaultUsername ?? "");
    setIsEditing(false);
  };

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <label htmlFor="username" className="sr-only">
          Username
        </label>
        <input
          ref={inputRef}
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={variant === "settings" && !isEditing}
          className="block w-full rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isEditing && availability && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs ${
              availability === "available"
                ? "text-accent"
                : availability === "checking"
                  ? "text-muted-foreground"
                  : "text-destructive"
            }`}
          >
            {availability === "checking" && "Checking availability…"}
            {availability === "available" && (
              <>
                <Check className="size-3.5" aria-hidden /> Username is available
              </>
            )}
            {availability === "taken" && (
              <>
                <X className="size-3.5" aria-hidden /> Username is already taken
              </>
            )}
            {availability === "invalid" &&
              "3-20 characters, letters/numbers/underscores only"}
          </p>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      )}
      {variant === "settings" && !isEditing ? (
        <button
          type="button"
          onClick={startEditing}
          className="flex cursor-pointer items-center gap-1.5 self-start rounded-md border border-border px-4 py-2 text-foreground transition-colors hover:border-accent"
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer self-start rounded-md border border-border px-4 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : variant === "settings" ? "Save" : "Continue"}
          </button>
          {variant === "settings" && (
            <button
              type="button"
              onClick={cancelEditing}
              disabled={pending}
              className="cursor-pointer self-start rounded-md px-4 py-2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
};
