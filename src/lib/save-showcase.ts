import { toast } from "sonner";
import type { ShowcaseMutationState } from "@/lib/showcase-mutations";

export type ShowcaseAction = (state: ShowcaseMutationState, formData: FormData) => Promise<ShowcaseMutationState>;

export const LOST_CONNECTION_ERROR = "Couldn't save your changes. Please try again.";

/**
 * Saves one showcase change and toasts the outcome. Call it inside the
 * transition that applied the change optimistically: when it fails, the
 * transition ending puts the saved value back on screen.
 */
export const saveShowcase = async (action: ShowcaseAction, formData: FormData, successMessage: string) => {
  // Unlike a returned error, a lost connection throws.
  const result = await action(undefined, formData).catch((): ShowcaseMutationState => ({
    error: LOST_CONNECTION_ERROR,
  }));
  if (result && "error" in result) toast.error(result.error);
  else if (result) toast.success(successMessage);
};
