export type MessageStatus = "pending" | "sent" | "failed";

export interface ChatMessage {
  id: string;
  /** Member id of the sender. 'self' or member UUID for the local user. */
  senderId: string;
  senderName: string;
  text: string;
  /** ISO timestamp */
  sentAt: string;
  /** Client sync / delivery status (DESIGN.md §14.1, §24) */
  status?: MessageStatus;
  /** Server-assigned monotonic sequence number for total ordering (DESIGN.md §14.3) */
  seq?: number;
}
