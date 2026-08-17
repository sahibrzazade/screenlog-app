type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const SearchBar = ({ value, onChange }: SearchBarProps) => (
  <div>
    <label htmlFor="search">Search</label>
    <input
      id="search"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search movies and TV shows..."
      className="border border-neutral-400 rounded bg-white px-3 py-1.5 text-neutral-900"
    />
  </div>
);
