const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (value: string | null) => {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const ageAt = (birth: Date, on: Date) => {
  const hadBirthday =
    on.getUTCMonth() > birth.getUTCMonth() ||
    (on.getUTCMonth() === birth.getUTCMonth() && on.getUTCDate() >= birth.getUTCDate());
  return on.getUTCFullYear() - birth.getUTCFullYear() - (hadBirthday ? 0 : 1);
};

/**
 * The person page's birth and death lines from TMDB's fields, each null when
 * TMDB has nothing for it: "Born 18 Dec 1963 · Shawnee, Oklahoma, USA" and
 * "Died 3 Jan 2020, aged 84".
 */
export const formatPersonLife = (
  birthday: string | null,
  deathday: string | null,
  placeOfBirth: string | null,
): { born: string | null; died: string | null } => {
  const birth = parseIsoDate(birthday);
  const death = parseIsoDate(deathday);
  const place = placeOfBirth?.trim() || null;

  const born = birth
    ? `Born ${[formatDate(birth), place].filter(Boolean).join(" · ")}`
    : place
      ? `Born in ${place}`
      : null;

  const died = death
    ? `Died ${formatDate(death)}${birth ? `, aged ${ageAt(birth, death)}` : ""}`
    : null;

  return { born, died };
};
