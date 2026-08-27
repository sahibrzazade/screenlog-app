import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const SearchBar = ({ value, onChange }: SearchBarProps) => (
  <div className="relative">
    <label htmlFor="search" className="sr-only">
      Search
    </label>
    <Search
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
    />
    <input
      id="search"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search movies and TV shows..."
      className="w-full rounded-md border border-border bg-surface py-2 pr-3 pl-9 text-foreground placeholder:text-subtle-foreground focus:border-accent focus:outline-none"
    />
  </div>
);
