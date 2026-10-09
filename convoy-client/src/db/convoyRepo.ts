import type { Convoy, Member } from "@/types";
import { getDatabase } from "./database";

/**
 * ============================================================================
 * Local Data Repository: Convoy & Members (DESIGN.md §14, §26)
 * ============================================================================
 */

export interface PersistedConvoyRow {
  id: string;
  name: string;
  code: string;
  host_id: string;
  self_id: string;
  phase: string;
  last_seq: number;
  settings_json: string;
  updated_at: number;
}

export interface PersistedMemberRow {
  id: string;
  convoy_id: string;
  name: string;
  is_host: number;
  status: string;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  location_ts: number | null;
  last_seen_at: string | null;
  updated_at: number;
}

export const convoyRepo = {
  /**
   * Upsert convoy and its members into SQLite transactionally.
   */
  saveConvoy(convoy: Convoy, lastSeq?: number): void {
    const db = getDatabase();
    const now = Date.now();

    db.withTransactionSync(() => {
      // 1. Upsert Convoy
      db.runSync(
        `
        INSERT INTO convoys (id, name, code, host_id, self_id, phase, last_seq, settings_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT last_seq FROM convoys WHERE id = ?), 0), ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          code = excluded.code,
          host_id = excluded.host_id,
          self_id = excluded.self_id,
          phase = excluded.phase,
          last_seq = CASE WHEN ? IS NOT NULL THEN ? ELSE convoys.last_seq END,
          settings_json = excluded.settings_json,
          updated_at = excluded.updated_at;
      `,
        [
          convoy.id,
          convoy.name,
          convoy.code,
          convoy.hostId,
          convoy.selfId,
          convoy.phase,
          lastSeq ?? null,
          convoy.id,
          JSON.stringify(convoy.settings),
          now,
          lastSeq ?? null,
          lastSeq ?? null,
        ],
      );

      // 2. Upsert Members
      for (const m of convoy.members) {
        db.runSync(
          `
          INSERT INTO members (id, convoy_id, name, is_host, status, lat, lng, heading, speed, location_ts, last_seen_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            is_host = excluded.is_host,
            status = excluded.status,
            lat = excluded.lat,
            lng = excluded.lng,
            heading = excluded.heading,
            speed = excluded.speed,
            location_ts = excluded.location_ts,
            last_seen_at = excluded.last_seen_at,
            updated_at = excluded.updated_at;
        `,
          [
            m.id,
            convoy.id,
            m.name,
            m.isHost ? 1 : 0,
            m.status,
            m.location?.lat ?? null,
            m.location?.lng ?? null,
            m.location?.heading ?? null,
            m.location?.speed ?? null,
            m.location?.timestamp ?? null,
            m.lastSeenAt ?? null,
            now,
          ],
        );
      }
    });
  },

  /**
   * Retrieves active convoy with all member records restored from SQLite.
   */
  getActiveConvoy(): Convoy | null {
    const db = getDatabase();

    const row = db.getFirstSync<PersistedConvoyRow>(`
      SELECT * FROM convoys ORDER BY updated_at DESC LIMIT 1;
    `);

    if (!row) return null;

    const memberRows = db.getAllSync<PersistedMemberRow>(
      `SELECT * FROM members WHERE convoy_id = ?;`,
      [row.id],
    );

    const members: Member[] = memberRows.map((mr) => ({
      id: mr.id,
      name: mr.name,
      isHost: Boolean(mr.is_host),
      status: mr.status as any,
      lastSeenAt: mr.last_seen_at ?? undefined,
      location:
        mr.lat != null && mr.lng != null
          ? {
              lat: mr.lat,
              lng: mr.lng,
              heading: mr.heading,
              speed: mr.speed,
              timestamp: mr.location_ts ?? Date.now(),
            }
          : undefined,
    }));

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      hostId: row.host_id,
      selfId: row.self_id,
      phase: row.phase as any,
      settings: JSON.parse(row.settings_json),
      members,
    };
  },

  /**
   * Update the latest synchronized sequence number from server.
   */
  updateLastSeq(convoyId: string, seq: number): void {
    const db = getDatabase();
    db.runSync(`UPDATE convoys SET last_seq = MAX(last_seq, ?) WHERE id = ?;`, [
      seq,
      convoyId,
    ]);
  },

  /**
   * Get current last_seq for a convoy.
   */
  getLastSeq(convoyId: string): number {
    const db = getDatabase();
    const row = db.getFirstSync<{ last_seq: number }>(
      `SELECT last_seq FROM convoys WHERE id = ?;`,
      [convoyId],
    );
    return row?.last_seq ?? 0;
  },

  /**
   * Clears convoy and cascading data from local SQLite.
   */
  clearConvoy(convoyId?: string): void {
    const db = getDatabase();
    if (convoyId) {
      db.runSync(`DELETE FROM convoys WHERE id = ?;`, [convoyId]);
    } else {
      db.runSync(`DELETE FROM convoys;`);
    }
  },
};
