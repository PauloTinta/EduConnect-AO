'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronLeft, MoreVertical, Phone, Video,
  Loader2, Check, CheckCheck, Send as SendIcon,
  Trash2, Edit2, Reply, Smile, X as CloseIcon,
  Music, Paperclip
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { ChatInput } from '@/components/chat/chat-input';
import { PollMessage } from '@/components/chat/poll-message';
import { uploadChatMedia, markMessagesAsSeen, getConversationDetails, deleteMessage, editMessage } from '@/lib/chat-utils';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'poll';
  content?: string;
  media_url?: string;
  poll_data?: {
    question: string;
    options: string[];
  };
  created_at: string;
  seen_at?: string;
  reply_to?: string;
  deleted_at?: string;
  updated_at?: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
}

interface Participant {
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
    last_seen?: string;
  };
}

import { MessageBubble } from '@/components/chat/message-bubble';

export const dynamic = 'force-dynamic';

export default function ChatRoom() {
  const params = useParams();
  const conversationId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherParticipant, setOtherParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processReactions = (rawReactions: any[]) => {
    if (!rawReactions) return [];
    const grouped: { [key: string]: { emoji: string; count: number; users: string[] } } = {};
    rawReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user_id);
    });
    return Object.values(grouped);
  };

  // 📥 LOAD CHAT & REALTIME
  useEffect(() => {
    if (!conversationId || !user) return;

    let isMounted = true;

    async function initializeChat() {
      if (!isMounted) return;
      
      setLoading(true);

      try {
        // 1. Clear ALL existing channels for this room to avoid duplicates (React StrictMode)
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        // Also remove any lingering channels with the same name
        const channelName = `room:${conversationId}:${Date.now()}`;

        // 2. Details
        const details = await getConversationDetails(conversationId, user!.id);
        if (isMounted) setOtherParticipant(details.otherParticipant);

        // 3. Initial Messages with Reactions
        const { data: initialMsgs, error: msgsError } = await supabase
          .from('messages')
          .select('*, message_reactions(emoji, user_id)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;

        // Transform reactions
        const processedMsgs = (initialMsgs || []).map(msg => ({
          ...msg,
          reactions: processReactions(msg.message_reactions || [])
        }));

        if (isMounted) setMessages(processedMsgs);

        // 4. Mark as seen
        await markMessagesAsSeen(conversationId, user!.id);

        // 5. Setup Realtime Channel — use unique name to avoid StrictMode conflicts
        if (!isMounted) return;
        const channel = supabase.channel(channelName);

        // 🟢 LISTEN: NOVAS MENSAGENS
        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: any) => {
            if (!isMounted) return;
            const newMsg = payload.new as unknown as Message;

            setMessages(prev => {
              // 1. Evitar duplicados se o ID já existir
              if (prev.some(m => m.id === newMsg.id)) return prev;
              
              // 2. Se for do próprio user, remove a mensagem otimista temporária
              if (newMsg.sender_id === user!.id) {
                const withoutTemp = prev.filter(m => 
                  !(m.id.toString().startsWith('temp-') && m.content === newMsg.content)
                );
                return [...withoutTemp, { ...newMsg, reactions: [] }];
              }

              // 3. Caso contrário, apenas adiciona
              return [...prev, { ...newMsg, reactions: [] }];
            });

            if (newMsg.sender_id !== user!.id) {
              markMessagesAsSeen(conversationId, user!.id);
            }
          }
        );

        // 🟡 LISTEN: UPDATE (edit, seen, delete)
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: any) => {
            if (!isMounted) return;
            const updated = payload.new as unknown as Message;
            setMessages(prev =>
              prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m))
            );
          }
        );

        // 🔵 LISTEN: REACTIONS
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions'
          },
          async () => {
            if (!isMounted) return;
            const { data } = await supabase
              .from('messages')
              .select('id, message_reactions(emoji, user_id)')
              .eq('conversation_id', conversationId);

            if (data && isMounted) {
              setMessages(prev =>
                prev.map(m => {
                  const updated = data.find(d => d.id === m.id);
                  return updated
                    ? {
                        ...m,
                        reactions: processReactions(updated.message_reactions)
                      }
                    : m;
                })
              );
            }
          }
        );

        // 🟣 LISTEN: TYPING (Broadcast)
        channel.on(
          'broadcast',
          { event: 'typing' },
          ({ payload }) => {
            if (!isMounted) return;
            if (payload.userId !== user!.id) {
              setTypingUser(payload.typing ? payload.userName : null);
            }
          }
        );

        // 🚀 FINALMENTE SUBSCRIBE
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('📡 Realtime SUBSCRIBED to room:', conversationId);
          }
        });

        channelRef.current = channel;

      } catch (err) {
        console.error('Chat error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeChat();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user]);

  // SCROLL TO BOTTOM
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, typingUser]);

  // FUNCTIONS
  const handleTyping = () => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName: user.user_metadata?.full_name || 'Alguém', typing: true }
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, typing: false }
      });
    }, 2000);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      });
    }
  };

  const sendTextMessage = async (content: string) => {
    if (!user || !conversationId) return;

    if (editingMessage) {
      try {
        await editMessage(editingMessage.id, content);
        setEditingMessage(null);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Otimistic Update
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'text',
      content,
      reply_to: replyTo?.id,
      created_at: new Date().toISOString(),
      reactions: []
    };

    setMessages(prev => [...prev, tempMsg]);
    setReplyTo(null);

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'text',
      content,
      reply_to: replyTo?.id
    });

    if (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      // The realtime listener will add the real message.
      // We should remove the temp one when the real one arrives.
      // To handle this, we can update the realtime listener to deduplicate.
    }
  };

  const sendMediaMessage = async (file: File, type: any) => {
    if (!user || !conversationId) return;
    try {
      const url = await uploadChatMedia(file, conversationId);
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type,
        media_url: url
      });
    } catch (err) {
      console.error(err);
    }
  };

  const sendPollMessage = async (question: string, options: string[]) => {
    if (!user || !conversationId) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'poll',
      poll_data: { question, options }
    });
  };

  const sendVoiceMessage = async (blob: Blob) => {
    if (!user || !conversationId) return;
    // @ts-ignore - File constructor is fine in modern browsers
    const file = new File([blob], 'voice_note.webm', { type: 'audio/webm' });
    await sendMediaMessage(file, 'voice');
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteMessage(id);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-white">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-[#F0F2F5] relative overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-200/40 px-4 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-300 active:scale-95">
            <ChevronLeft size={24} />
          </button>
          <div 
            className="flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-2xl hover:bg-slate-50/80 transition-all duration-300 active:scale-95"
            onClick={() => router.push(otherParticipant?.user_id === user?.id ? '/profile' : `/profile/${otherParticipant?.user_id}`)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex-shrink-0 bg-slate-100 relative group-hover:scale-105 transition-transform duration-300">
              <Image 
                src={otherParticipant?.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.profiles?.username || 'default'}`} 
                alt="Avatar" 
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h1 className="font-bold text-[15px] text-slate-800 leading-none group-hover:text-blue-600 transition-colors">
                {otherParticipant?.profiles?.full_name || 'Usuário'}
              </h1>
              <p className="text-[11px] text-green-500 font-bold flex items-center gap-1.5 mt-1.5 tracking-wide">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-slow-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                No ar agora
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 text-slate-500">
          <button className="p-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 active:scale-90"><Phone size={20}/></button>
          <button className="p-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 active:scale-90"><Video size={20}/></button>
          <button className="p-2.5 rounded-full hover:bg-slate-100 hover:text-slate-800 transition-all duration-300 active:scale-90"><MoreVertical size={20}/></button>
        </div>
      </header>

      {/* MESSAGES AREA */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto pt-24 pb-6 px-4 space-y-1.5 relative selection:bg-blue-100"
        style={{ 
          backgroundImage: 'url("https://w0.peakpx.com/wallpaper/705/850/wallpaper-whatsapp-background.jpg")', 
          backgroundSize: '360px',
          backgroundRepeat: 'repeat',
          backgroundColor: '#f1f5f9'
        }}
      >
        <div className="absolute inset-0 bg-slate-50/70 backdrop-grayscale-[0.05] pointer-events-none" />

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          const nextMsg = messages[index + 1];
          const prevMsg = messages[index - 1];
          
          const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
          
          const showTime = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 1800000;
          const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;

          return (
            <div key={msg.id} className="relative">
              {showTime && (
                <div className="flex justify-center my-8 sticky top-2 z-10 transition-all duration-300">
                  <span className="px-5 py-2 bg-white/60 backdrop-blur-xl rounded-full text-[10px] font-black text-slate-500/80 uppercase tracking-[0.2em] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white/50">
                    {new Date(msg.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              
              <MessageBubble 
                msg={{...msg, replied_message: repliedMsg as any}}
                isMe={isMe}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                currentUserId={user?.id || ''}
                otherParticipantName={otherParticipant?.profiles?.full_name}
                onReply={setReplyTo}
                onEdit={setEditingMessage}
                onDelete={handleDeleteMessage}
                onReact={handleReact}
              />
            </div>
          );
        })}

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUser && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex justify-start px-2 mb-4"
            >
              <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-[22px] rounded-tl-none shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-white/60 flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                   {typingUser} está a escrever...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* INPUT AREA */}
      <div className="z-50 bg-white relative">
        <ChatInput 
          onSendMessage={(content) => {
            sendTextMessage(content);
            handleTyping();
          }} 
          onSendMedia={sendMediaMessage}
          onSendPoll={sendPollMessage}
          onSendVoice={sendVoiceMessage}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

    </main>
  );
}

// Simple Icon components to avoid import errors if needed