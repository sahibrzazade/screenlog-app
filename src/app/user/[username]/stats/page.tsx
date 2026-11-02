import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatsPeriodLinks } from "@/components/stats-period-links";
import { StatsTotals } from "@/components/stats-totals";
import { computeTotals, logsInPeriod, parseStatsPeriod, periodLabel, statsYears } from "@/lib/stats";
import { getRuntimes, getStatsLogs } from "@/lib/stats-data";

type UserStatsPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
};

/**
 * Public "Year in Review"-style numbers for a user. Logs and profiles are
 * publicly readable (0009, 0014), so this works for guests too.
 */
const UserStatsPage = async ({ params, searchParams }: UserStatsPageProps) => {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles_public")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const currentYear = new Date().getUTCFullYear();
  const period = parseStatsPeriod((await searchParams).year, currentYear);
  const allLogs = await getStatsLogs(supabase, profile.id);
  const logs = logsInPeriod(allLogs, period);
  // Only resolve runtimes for the period shown — TMDB lookups are the slow part.
  const totals = logs.length > 0 ? computeTotals(logs, await getRuntimes(logs)) : null;
  const basePath = `/user/${profile.username}/stats`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/user/${profile.username}`} className="text-sm text-accent hover:text-accent-hover">
        ← Back to profile
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{profile.username}&apos;s stats</h1>

      <div className="mt-4">
        <StatsPeriodLinks
          basePath={basePath}
          years={statsYears(allLogs, currentYear)}
          period={period}
          currentYear={currentYear}
        />
      </div>

      {totals ? (
        <section aria-label={`Totals for ${periodLabel(period)}`} className="mt-6">
          <StatsTotals {...totals} />
        </section>
      ) : (
        <p className="mt-6 text-muted-foreground">No entries in {periodLabel(period)}.</p>
      )}
    </main>
  );
};

export default UserStatsPage;
