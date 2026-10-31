"use client";

import { Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

type CopyProfileLinkButtonProps = {
  username: string;
};

/**
 * Copies the absolute URL of a profile to the clipboard. Write-only: the
 * clipboard is never read. Usernames are validated to [a-zA-Z0-9_] on write,
 * so the copied text is always a plain same-origin profile URL.
 */
export const CopyProfileLinkButton = ({ username }: CopyProfileLinkButtonProps) => {
  const handleCopy = async () => {
    const url = `${window.location.origin}/user/${encodeURIComponent(username)}`;
    try {
      // `navigator.clipboard` is undefined outside secure contexts (HTTPS / localhost).
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy profile link"
      title="Copy profile link"
      className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LinkIcon aria-hidden="true" className="size-5" />
    </button>
  );
};
