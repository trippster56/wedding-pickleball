import type { GameResult, Team, TeamCount, Tournament } from "./types";
import { buildBracket, resolveTournament } from "./bracket";
import { defaultTournament } from "./roster";

/**
 * Storage abstraction for the single shared tournament document.
 *
 * Production: Redis via `REDIS_URL` (the connection string the Vercel Upstash
 * integration injects). Game results live in a Redis hash (one field per game)
 * so two phones resolving different games never clobber each other. A version
 * counter bumps on every write.
 *
 * Local dev (no REDIS_URL): a JSON file under .data/ so state survives restarts.
 */

const META_KEY = "pb:meta";
const RESULTS_KEY = "pb:results";
const VERSION_KEY = "pb:version";

type Meta = {
  teamCount: TeamCount;
  phase: Tournament["phase"];
  teams: Team[];
  updatedAt: number;
};

interface Backend {
  read(): Promise<Tournament>;
  setResult(gameId: string, result: GameResult): Promise<void>;
  clearResult(gameId: string): Promise<void>;
  reset(meta: Meta): Promise<void>;
  bumpVersion(): Promise<void>;
}

// ---------- Redis backend (ioredis over REDIS_URL) ----------

function redisUrl(): string | null {
  return process.env.REDIS_URL || null;
}

// Reuse one client across serverless invocations / dev hot-reloads.
type IORedis = import("ioredis").Redis;
const g = globalThis as unknown as { __pbRedis?: Promise<IORedis> };

async function getRedis(url: string): Promise<IORedis> {
  if (!g.__pbRedis) {
    g.__pbRedis = import("ioredis").then(({ default: Redis }) => {
      const client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });
      client.on("error", (e: Error) => console.error("[redis]", e.message));
      return client;
    });
  }
  return g.__pbRedis;
}

function parse<T>(raw: string | null): T | null {
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

class RedisBackend implements Backend {
  constructor(private url: string) {}

  private r() {
    return getRedis(this.url);
  }

  async read(): Promise<Tournament> {
    const redis = await this.r();
    const [metaRaw, resultsRaw, versionRaw] = await Promise.all([
      redis.get(META_KEY),
      redis.hgetall(RESULTS_KEY),
      redis.get(VERSION_KEY),
    ]);
    const meta = parse<Meta>(metaRaw);
    if (!meta) {
      const seeded = defaultTournament();
      await this.reset({
        teamCount: seeded.teamCount,
        phase: seeded.phase,
        teams: seeded.teams,
        updatedAt: seeded.updatedAt,
      });
      return seeded;
    }
    const results: Record<string, GameResult> = {};
    for (const [id, raw] of Object.entries(resultsRaw ?? {})) {
      const gr = parse<GameResult>(raw);
      if (gr) results[id] = gr;
    }
    return {
      version: Number(versionRaw) || 1,
      teamCount: meta.teamCount,
      phase: meta.phase,
      teams: meta.teams,
      results,
      updatedAt: meta.updatedAt,
    };
  }

  async setResult(gameId: string, result: GameResult): Promise<void> {
    const redis = await this.r();
    await redis.hset(RESULTS_KEY, gameId, JSON.stringify(result));
    await this.touch();
  }

  async clearResult(gameId: string): Promise<void> {
    const redis = await this.r();
    await redis.hdel(RESULTS_KEY, gameId);
    await this.touch();
  }

  async reset(meta: Meta): Promise<void> {
    const redis = await this.r();
    await redis.del(RESULTS_KEY);
    await redis.set(META_KEY, JSON.stringify(meta));
    await redis.incr(VERSION_KEY);
  }

  async bumpVersion(): Promise<void> {
    const redis = await this.r();
    await redis.incr(VERSION_KEY);
  }

  private async touch(): Promise<void> {
    const redis = await this.r();
    await redis.incr(VERSION_KEY);
    const meta = parse<Meta>(await redis.get(META_KEY));
    if (meta)
      await redis.set(META_KEY, JSON.stringify({ ...meta, updatedAt: Date.now() }));
  }
}

// ---------- File backend (local dev) ----------

class FileBackend implements Backend {
  private file: string;
  private lock: Promise<unknown> = Promise.resolve();

  constructor() {
    this.file = "";
  }

  private async paths() {
    const path = await import("node:path");
    const dir = path.join(process.cwd(), ".data");
    return { dir, file: path.join(dir, "tournament.json") };
  }

  private async load(): Promise<Tournament> {
    const fs = await import("node:fs/promises");
    const { file } = await this.paths();
    try {
      const raw = await fs.readFile(file, "utf8");
      return JSON.parse(raw) as Tournament;
    } catch {
      const seeded = defaultTournament();
      await this.save(seeded);
      return seeded;
    }
  }

  private async save(t: Tournament): Promise<void> {
    const fs = await import("node:fs/promises");
    const { dir, file } = await this.paths();
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(t, null, 2), "utf8");
  }

  // Serialize mutations so concurrent dev requests don't clobber the file.
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lock.then(fn, fn);
    this.lock = next.catch(() => undefined);
    return next;
  }

  read(): Promise<Tournament> {
    return this.run(() => this.load());
  }

  setResult(gameId: string, result: GameResult): Promise<void> {
    return this.run(async () => {
      const t = await this.load();
      t.results[gameId] = result;
      t.version += 1;
      t.updatedAt = Date.now();
      await this.save(t);
    });
  }

  clearResult(gameId: string): Promise<void> {
    return this.run(async () => {
      const t = await this.load();
      delete t.results[gameId];
      t.version += 1;
      t.updatedAt = Date.now();
      await this.save(t);
    });
  }

  reset(meta: Meta): Promise<void> {
    return this.run(async () => {
      const t = await this.load();
      await this.save({
        version: t.version + 1,
        teamCount: meta.teamCount,
        phase: meta.phase,
        teams: meta.teams,
        results: {},
        updatedAt: meta.updatedAt,
      });
    });
  }

  bumpVersion(): Promise<void> {
    return this.run(async () => {
      const t = await this.load();
      t.version += 1;
      await this.save(t);
    });
  }
}

// ---------- Singleton backend ----------

let backend: Backend | null = null;
function getBackend(): Backend {
  if (backend) return backend;
  const url = redisUrl();
  backend = url ? new RedisBackend(url) : new FileBackend();
  return backend;
}

export function usingRedis(): boolean {
  return redisUrl() !== null;
}

// ---------- Public operations used by the API ----------

export async function readTournament(): Promise<Tournament> {
  return getBackend().read();
}

/**
 * Remove any recorded results whose game is no longer valid (participants became
 * TBD, or the game is inactive). Repeats until stable. Keeps the doc consistent
 * after an undo/overwrite invalidates downstream games.
 */
async function pruneInvalidResults(): Promise<void> {
  const be = getBackend();
  for (let pass = 0; pass < 12; pass++) {
    const t = await be.read();
    const view = resolveTournament(t);
    const invalid = view.games.filter(
      (g) => g.result && (!g.active || g.a.state !== "team" || g.b.state !== "team"),
    );
    if (invalid.length === 0) return;
    for (const g of invalid) await be.clearResult(g.id);
  }
}

export async function recordResult(
  gameId: string,
  result: GameResult,
): Promise<Tournament> {
  const be = getBackend();
  await be.setResult(gameId, result);
  await pruneInvalidResults();
  return be.read();
}

export async function clearResult(gameId: string): Promise<Tournament> {
  const be = getBackend();
  await be.clearResult(gameId);
  await pruneInvalidResults();
  return be.read();
}

export async function resetTournament(
  teamCount: TeamCount,
  teams: Team[],
): Promise<Tournament> {
  const be = getBackend();
  await be.reset({
    teamCount,
    phase: "live",
    teams,
    updatedAt: Date.now(),
  });
  return be.read();
}

// Re-export so API routes can build the graph if needed.
export { buildBracket, resolveTournament };
