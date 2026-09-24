"use client";

import { forwardRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<ComponentProps<"input">, "type">;

/** A password `<input>` with a show/hide toggle, sharing one look across every auth form. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={`w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-10 text-foreground focus:border-accent focus:outline-none ${className ?? ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
