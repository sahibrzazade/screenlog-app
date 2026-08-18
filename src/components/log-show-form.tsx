"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RatingStars } from "@/components/rating-stars";
import { logShow, type LogShowFormState } from "@/app/tv/[id]/actions";

type LogShowFormProps = {
  tmdbShowId: number;
  initialLog: { rating: number; review: string | null } | null;
};

export const LogShowForm = ({ tmdbShowId, initialLog }: LogShowFormProps) => {
  const [state, formAction, pending] = useActionState<LogShowFormState, FormData>(
    logShow,
    undefined,
  );

  const [rating, setRating] = useState<number | null>(initialLog?.rating ?? null);
  const wasExistingLogRef = useRef(initialLog !== null);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(wasExistingLogRef.current ? "Log updated" : "Log saved");
      wasExistingLogRef.current = true;
    }
  }, [state]);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="tmdbShowId" value={tmdbShowId} />
      <div>
        <span className="mb-1 block text-sm font-medium">Rating</span>
        <RatingStars value={rating} onChange={setRating} />
      </div>
      <div>
        <label htmlFor="review" className="mb-1 block text-sm font-medium">
          Review (optional)
        </label>
        <textarea
          id="review"
          name="review"
          rows={4}
          defaultValue={initialLog?.review ?? ""}
          maxLength={2000}
          className="w-full border border-neutral-400 rounded bg-white px-3 py-1.5 text-neutral-900"
        />
      </div>
      {state && "error" in state && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : initialLog ? "Update rating" : "Rate this show"}
      </button>
    </form>
  );
};
