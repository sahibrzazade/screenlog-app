"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
import { changePassword, type ChangePasswordState } from "@/app/settings/actions";

export const ChangePasswordForm = () => {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );
  const [isOpen, setIsOpen] = useState(false);
  const handledSuccessRef = useRef(false);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const passwordsMismatch =
    confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

  // Adjusting state when a value changes, during render rather than in an
  // effect (https://react.dev/learn/you-might-not-need-an-effect): once a
  // save succeeds, collapse back to the closed "Change password" button.
  // Comparing against the previous state (not just checking success) avoids
  // re-closing every time the form is reopened after an earlier success.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state && "success" in state) {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    if (state && "success" in state && !handledSuccessRef.current) {
      handledSuccessRef.current = true;
      toast.success("Password changed");
    }
  }, [state]);

  useEffect(() => {
    if (isOpen) currentPasswordRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer self-start rounded-md border border-border px-4 py-2 text-foreground transition-colors hover:border-accent"
      >
        Change password
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <PasswordInput
          ref={currentPasswordRef}
          id="currentPassword"
          name="currentPassword"
          required
          autoComplete="current-password"
          className="mt-1"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="confirmNewPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <PasswordInput
          id="confirmNewPassword"
          name="confirmNewPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
        />
        {passwordsMismatch && (
          <p className="mt-1 text-xs text-destructive">Passwords don&apos;t match.</p>
        )}
      </div>
      {state && "error" in state && (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || passwordsMismatch}
          className="cursor-pointer self-start rounded-md border border-border px-4 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          disabled={pending}
          className="cursor-pointer self-start rounded-md px-4 py-2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
