"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type PersonBioProps = {
  biography: string;
};

/**
 * A person's biography, clamped to four lines with a "Read more" toggle that
 * only appears when the text is actually cut off. Renders nothing when empty.
 */
export const PersonBio = ({ biography }: PersonBioProps) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textId = useId();
  const text = biography.trim();

  useEffect(() => {
    const element = textRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    // Measured while clamped; once expanded the toggle stays so it can collapse.
    const observer = new ResizeObserver(() => {
      if (!element.classList.contains("line-clamp-4")) return;
      setOverflows(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!text) return null;

  return (
    <div className="mt-3 max-w-2xl">
      <div
        ref={textRef}
        id={textId}
        className={`whitespace-pre-line ${expanded ? "" : "line-clamp-4"}`}
      >
        {text}
      </div>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded text-sm font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
};
