"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Confirms a deleted list. `deleteList` redirects here with `?deleted=1`, since
 * a redirect returns nothing to the client; clearing the param stops a reload
 * repeating the toast. The fixed id stops Strict Mode's double effect showing two.
 */
export const ListDeletedToast = ({ listsPath }: { listsPath: string }) => {
  const router = useRouter();

  useEffect(() => {
    toast.success("List deleted", { id: "list-deleted" });
    router.replace(listsPath, { scroll: false });
  }, [router, listsPath]);

  return null;
};
