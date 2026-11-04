/** Raw `page` param → a page within 1…totalPages (1 for anything invalid). */
export const parsePage = (raw: string | string[] | undefined, totalPages: number): number => {
  const requested = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(requested) ? Math.min(Math.max(1, requested), totalPages) : 1;
};
