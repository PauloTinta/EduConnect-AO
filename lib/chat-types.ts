export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'poll';
  content?: string;
  media_url?: string;
  poll_data?: { question: string; options: string[] };
  created_at: string;
  seen_at?: string;
  reply_to?: string;
  deleted_at?: string;
  updated_at?: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
  replied_message?: Message;
}