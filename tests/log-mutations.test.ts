import { describe, expect, it, vi, beforeEach } from "vitest";
import { getUserContext } from "@/lib/supabase/auth";
import {
  deleteLog,
  parseLogId,
  saveLog,
  saveRating,
  saveWatchForm,
  toggleWatched,
  type LogTarget,
} from "@/lib/logs/mutations";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getUserContext: vi.fn() }));

const LOG_ID = "0b6f2c1e-6a1d-4c2b-9d6e-2f4a8b1c3d5e";
const LATEST_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const target: LogTarget = {
  table: "movie_logs",
  match: { tmdb_movie_id: 438631 },
  revalidate: "/movie/438631",
  entity: "movie",
};

type Op = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  values?: Record<string, unknown>;
  match?: Record<string, unknown>;
  eq: Record<string, unknown>;
  single?: boolean;
};

type Db = { latestId?: string | null; logs?: { id: string; rating: number | null; review: string | null }[]; updates?: boolean };

/**
 * Stand-in for supabase-js: records each query as an Op and answers it from
 * `db` — a single-row select gets the latest log id, a list select gets
 * `logs`, an update reports whether it matched a row.
 */
const useDb = (db: Db = {}) => {
  const ops: Op[] = [];
  const supabase = {
    from: (table: string) => {
      const op: Op = { table, action: "select", eq: {} };
      ops.push(op);
      const builder = {
        select: () => builder,
        insert: (values: Record<string, unknown>) => Object.assign(op, { action: "insert", values }) && builder,
        update: (values: Record<string, unknown>) => Object.assign(op, { action: "update", values }) && builder,
        delete: () => Object.assign(op, { action: "delete" }) && builder,
        match: (filter: Record<string, unknown>) => Object.assign(op, { match: filter }) && builder,
        eq: (column: string, value: unknown) => {
          op.eq[column] = value;
          return builder;
        },
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          op.single = true;
          return builder;
        },
        then: (resolve: (value: unknown) => void) => {
          if (op.action === "select") {
            resolve(
              op.single
                ? { data: db.latestId ? { id: db.latestId } : null }
                : { data: db.logs ?? [], error: null },
            );
          } else if (op.action === "update") {
            resolve({ data: db.updates === false ? [] : [{ id: op.eq.id }], error: null });
          } else {
            resolve({ error: null });
          }
        },
      };
      return builder;
    },
  };
  vi.mocked(getUserContext).mockResolvedValue({ supabase, user: { id: "user-1" } } as never);
  return ops;
};

const writes = (ops: Op[]) => ops.filter((op) => op.action !== "select");

beforeEach(() => vi.mocked(getUserContext).mockReset());

describe("parseLogId", () => {
  it("reads a missing id as the latest log and rejects a malformed one", () => {
    expect(parseLogId(null)).toBeNull();
    expect(parseLogId("")).toBeNull();
    expect(parseLogId(LOG_ID)).toBe(LOG_ID);
    expect(parseLogId("not-a-uuid")).toBeUndefined();
  });
});

describe("saveLog", () => {
  it("updates the named watch only, scoped to the user and title", async () => {
    const ops = useDb();

    expect(await saveLog(target, LOG_ID, "Great", "2026-11-01")).toEqual({ success: true });

    expect(writes(ops)).toEqual([
      expect.objectContaining({
        action: "update",
        values: { review: "Great", watched_date: "2026-11-01" },
        match: { user_id: "user-1", tmdb_movie_id: 438631 },
        eq: { id: LOG_ID },
      }),
    ]);
  });

  it("updates the latest watch when the form sends no id", async () => {
    const ops = useDb({ latestId: LATEST_ID });

    await saveLog(target, null, null, "2026-11-01");

    expect(writes(ops)).toEqual([expect.objectContaining({ action: "update", eq: { id: LATEST_ID } })]);
  });

  it("creates the first log when the title has none", async () => {
    const ops = useDb({ latestId: null });

    await saveLog(target, null, "First", "2026-11-01");

    expect(writes(ops)).toEqual([
      expect.objectContaining({
        action: "insert",
        values: { user_id: "user-1", tmdb_movie_id: 438631, review: "First", watched_date: "2026-11-01" },
      }),
    ]);
  });

  it("rejects a malformed id without touching the database", async () => {
    const ops = useDb();

    expect(await saveLog(target, "../other", null, "2026-11-01")).toEqual({ error: "Invalid log." });
    expect(ops).toEqual([]);
  });

  it("fails when the id matches none of the user's logs for the title", async () => {
    useDb({ updates: false });

    expect(await saveLog(target, LOG_ID, null, "2026-11-01")).toEqual({
      error: "Failed to save your log. Please try again.",
    });
  });
});

const form = (fields: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
};

describe("saveWatchForm", () => {
  it("adds a watch with its rating and rewatch mark from a Log again form", async () => {
    const ops = useDb({ latestId: LATEST_ID });

    await saveWatchForm(target, form({ newWatch: "1", rating: "3.5", rewatch: "on" }), "Again", "2026-11-08");

    expect(writes(ops)).toEqual([
      expect.objectContaining({
        action: "insert",
        values: {
          user_id: "user-1",
          tmdb_movie_id: 438631,
          review: "Again",
          watched_date: "2026-11-08",
          rating: 3.5,
          rewatch: true,
        },
      }),
    ]);
  });

  it("updates the form's watch, saving the checkbox", async () => {
    const ops = useDb();

    await saveWatchForm(target, form({ logId: LOG_ID }), null, "2025-03-02");

    expect(writes(ops)).toEqual([
      expect.objectContaining({
        action: "update",
        values: { review: null, watched_date: "2025-03-02", rewatch: false },
        eq: { id: LOG_ID },
      }),
    ]);
  });

  it("rejects an invalid rating on a new watch", async () => {
    const ops = useDb();

    expect(await saveWatchForm(target, form({ newWatch: "1", rating: "7" }), null, "2026-11-08")).toEqual({
      error: "Invalid rating.",
    });
    expect(writes(ops)).toEqual([]);
  });
});

describe("saveRating", () => {
  it("creates the first log with the rating when there is none", async () => {
    const ops = useDb({ latestId: null });

    expect(await saveRating(target, null, 4.5, null)).toEqual({ rating: 4.5 });
    expect(writes(ops)).toEqual([
      expect.objectContaining({ action: "insert", values: { user_id: "user-1", tmdb_movie_id: 438631, rating: 4.5 } }),
    ]);
  });
});

describe("deleteLog", () => {
  it("deletes the named watch only", async () => {
    const ops = useDb();

    await deleteLog(target, LOG_ID);

    expect(writes(ops)).toEqual([
      expect.objectContaining({ action: "delete", match: { user_id: "user-1", tmdb_movie_id: 438631 }, eq: { id: LOG_ID } }),
    ]);
  });
});

describe("toggleWatched", () => {
  it("adds nothing when the title is already logged", async () => {
    const ops = useDb({ logs: [{ id: LOG_ID, rating: null, review: null }] });

    expect(await toggleWatched(target, false)).toEqual({ isWatched: true });
    expect(writes(ops)).toEqual([]);
  });

  it("removes a single bare watch", async () => {
    const ops = useDb({ logs: [{ id: LOG_ID, rating: null, review: null }] });

    expect(await toggleWatched(target, true)).toEqual({ isWatched: false });
    expect(writes(ops)).toEqual([expect.objectContaining({ action: "delete", eq: { id: LOG_ID } })]);
  });

  it("won't unmark a title watched more than once", async () => {
    const ops = useDb({
      logs: [
        { id: LOG_ID, rating: null, review: null },
        { id: LATEST_ID, rating: null, review: null },
      ],
    });

    expect(await toggleWatched(target, true)).toMatchObject({ isWatched: true, error: expect.any(String) });
    expect(writes(ops)).toEqual([]);
  });
});
