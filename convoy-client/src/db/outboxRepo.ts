import { getDatabase } from "./database";

/**
 * ============================================================================
 * Local Data Repository: Outbox Pattern (DESIGN.md §14.1, §14.3, §26)
 * ============================================================================
 * Implements durable local queuing for user actions while offline or during
 * intermittent connectivity. Flushed oldest-first upon reconnection.
 */

export interface PersistedOutboxRow {
  client_id: string;
  convoy_id: string;
  type: string;
  payload_json: string;
  created_at: number;
  attempts: number;
  last_attempt_at: number | null;
  error: string | null;
}

export interface OutboxItem<T = any> {
  clientId: string;
  convoyId: string;
  type: string;
  payload: T;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

export const outboxRepo = {
  /**
   * Enqueue a new mutation into the durable outbox table.
   */
  enqueue<T = any>(item: {
    clientId: string;
    convoyId: string;
    type: string;
    payload: T;
  }): void {
    const db = getDatabase();
    const now = Date.now();

    db.runSync(
      `
      INSERT INTO outbox (client_id, convoy_id, type, payload_json, created_at, attempts)
      VALUES (?, ?, ?, ?, ?, 0)
      ON CONFLICT(client_id) DO UPDATE SET
        payload_json = excluded.payload_json,
        created_at = excluded.created_at;
    `,
      [
        item.clientId,
        item.convoyId,
        item.type,
        JSON.stringify(item.payload),
        now,
      ],
    );
  },

  /**
   * Peek at pending outbox items ordered chronologically (oldest first).
   */
  peekPending(limit: number = 20): OutboxItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<PersistedOutboxRow>(
      `
      SELECT * FROM outbox
      ORDER BY created_at ASC
      LIMIT ?;
    `,
      [limit],
    );

    return rows.map((r) => ({
      clientId: r.client_id,
      convoyId: r.convoy_id,
      type: r.type,
      payload: JSON.parse(r.payload_json),
      createdAt: r.created_at,
      attempts: r.attempts,
      lastAttemptAt: r.last_attempt_at ?? undefined,
      error: r.error ?? undefined,
    }));
  },

  /**
   * Remove an item from the outbox after successful delivery or server ack.
   */
  remove(clientId: string): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM outbox WHERE client_id = ?;`, [clientId]);
  },

  /**
   * Record a failed delivery attempt with timestamp and error message.
   */
  incrementAttempts(clientId: string, error?: string): void {
    const db = getDatabase();
    const now = Date.now();
    db.runSync(
      `
      UPDATE outbox
      SET attempts = attempts + 1,
          last_attempt_at = ?,
          error = ?
      WHERE client_id = ?;
    `,
      [now, error ?? null, clientId],
    );
  },

  /**
   * Get the current count of pending outbox items awaiting flush.
   */
  getPendingCount(convoyId?: string): number {
    const db = getDatabase();
    if (convoyId) {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM outbox WHERE convoy_id = ?;`,
        [convoyId],
      );
      return row?.count ?? 0;
    }
    const row = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM outbox;`,
    );
    return row?.count ?? 0;
  },

  /**
   * Clears outbox items.
   */
  clear(convoyId?: string): void {
    const db = getDatabase();
    if (convoyId) {
      db.runSync(`DELETE FROM outbox WHERE convoy_id = ?;`, [convoyId]);
    } else {
      db.runSync(`DELETE FROM outbox;`);
    }
  },
};
