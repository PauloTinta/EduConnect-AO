// ─────────────────────────────────────────────
// Shared types used across the EduConnect app
// ─────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'poll';

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface PollData {
  question: string;
  options: string[];
}

/**
 * Full Message type — used in the chat page and state.
 * conversation_id is always present when fetched from the DB.
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  content?: string;
  media_url?: string;
  poll_data?: PollData;
  created_at: string;
  seen_at?: string;
  reply_to?: string;
  deleted_at?: string;
  updated_at?: string;
  reactions?: Reaction[];
  /** Populated client-side by joining on reply_to */
  replied_message?: Message;
}

export interface Participant {
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
    last_seen?: string;
  };
}

export interface RawReaction {
  emoji: string;
  user_id: string;
}
