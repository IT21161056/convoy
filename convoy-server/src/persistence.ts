import fs from "fs";
import path from "path";
import type { Convoy } from "./state";

const STATE_FILE = path.resolve(process.cwd(), ".convoy-state.json");
const WRITE_DEBOUNCE_MS = 500;

let writeTimer: ReturnType<typeof setTimeout> | null = null;

interface PersistedShape {
  convoys: Array<Omit<Convoy, "sockets" | "processedClientIds">>;
  savedAt: number;
}

/**
 * Serialize every convoy (minus runtime-only socket and processedClientIds sets).
 */
export function saveConvoys(convoys: Map<string, Convoy>) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      const payload: PersistedShape = {
        convoys: [...convoys.values()].map(
          ({ sockets: _s, processedClientIds: _p, ...rest }) => rest,
        ),
        savedAt: Date.now(),
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.warn("[persist] failed to write state", err);
    }
    writeTimer = null;
  }, WRITE_DEBOUNCE_MS);
}

/**
 * Load persisted convoys on startup. Reconstitutes sequences and deduplication sets.
 */
export function loadConvoys(target: Map<string, Convoy>): number {
  if (!fs.existsSync(STATE_FILE)) return 0;

  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as PersistedShape;

    for (const c of parsed.convoys) {
      const messages = c.messages ?? [];
      const clientIds = new Set<string>();
      for (const m of messages) {
        if (m.clientId) clientIds.add(m.clientId);
      }

      target.set(c.id, {
        ...c,
        seq: c.seq ?? 0,
        messages,
        processedClientIds: clientIds,
        sockets: new Map(),
      });
    }

    console.log(
      `[persist] loaded ${parsed.convoys.length} convoy(s) from disk (saved ${new Date(parsed.savedAt).toISOString()})`,
    );
    return parsed.convoys.length;
  } catch (err) {
    console.warn("[persist] failed to load state, starting fresh", err);
    return 0;
  }
}
