"use client";

import { forwardRef, useId } from "react";
import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, placeholder = "Search movies and TV shows..." }, ref) => {
    const inputId = useId();

    return (
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Search
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
        />
        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-surface py-2 pr-3 pl-9 text-foreground placeholder:text-subtle-foreground focus:border-accent focus:outline-none"
        />
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
