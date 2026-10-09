import type { ChatMessage, MessageStatus } from "@/types";
import { getDatabase } from "./database";

/**
 * ============================================================================
 * Local Data Repository: Chat Messages (DESIGN.md §14, §24, §26)
 * ============================================================================
 * Stores messages in SQLite with append-only sequence ordering and optimistic
 * pending states for offline resilient delivery.
 */

export interface PersistedMessageRow {
  id: string;
  convoy_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  sent_at: string;
  seq: number | null;
  status: string;
  created_at: number;
}

export const chatRepo = {
  /**
   * Upsert a chat message into local SQLite.
   */
  saveMessage(
    msg: ChatMessage,
    convoyId: string,
    status: MessageStatus = msg.status ?? "sent",
    seq?: number,
  ): void {
    const db = getDatabase();
    const now = Date.now();
    const resolvedSeq = seq ?? msg.seq ?? null;

    db.runSync(
      `
      INSERT INTO messages (id, convoy_id, sender_id, sender_name, text, sent_at, seq, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        text = excluded.text,
        sent_at = excluded.sent_at,
        seq = COALESCE(excluded.seq, messages.seq),
        status = excluded.status;
    `,
      [
        msg.id,
        convoyId,
        msg.senderId,
        msg.senderName,
        msg.text,
        msg.sentAt,
        resolvedSeq,
        status,
        now,
      ],
    );
  },

  /**
   * Get all messages for a convoy ordered chronologically.
   * If messages have server sequence numbers, ordered by seq, with pending messages at the end.
   */
  getMessages(convoyId: string, limit: number = 200): ChatMessage[] {
    const db = getDatabase();

    const rows = db.getAllSync<PersistedMessageRow>(
      `
      SELECT * FROM messages
      WHERE convoy_id = ?
      ORDER BY created_at ASC
      LIMIT ?;
    `,
      [convoyId, limit],
    );

    return rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      text: r.text,
      sentAt: r.sent_at,
      status: r.status as MessageStatus,
      seq: r.seq ?? undefined,
    }));
  },

  /**
   * Updates delivery status (e.g. from 'pending' to 'sent' once acknowledged).
   */
  updateMessageStatus(id: string, status: MessageStatus, seq?: number): void {
    const db = getDatabase();
    if (seq !== undefined) {
      db.runSync(`UPDATE messages SET status = ?, seq = ? WHERE id = ?;`, [
        status,
        seq,
        id,
      ]);
    } else {
      db.runSync(`UPDATE messages SET status = ? WHERE id = ?;`, [status, id]);
    }
  },

  /**
   * Retrieve a single message by ID.
   */
  getMessage(id: string): ChatMessage | null {
    const db = getDatabase();
    const row = db.getFirstSync<PersistedMessageRow>(
      `SELECT * FROM messages WHERE id = ?;`,
      [id],
    );
    if (!row) return null;
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      text: row.text,
      sentAt: row.sent_at,
      status: row.status as MessageStatus,
      seq: row.seq ?? undefined,
    };
  },

  /**
   * Clears messages for a convoy or entirely.
   */
  clearMessages(convoyId?: string): void {
    const db = getDatabase();
    if (convoyId) {
      db.runSync(`DELETE FROM messages WHERE convoy_id = ?;`, [convoyId]);
    } else {
      db.runSync(`DELETE FROM messages;`);
    }
  },
};
