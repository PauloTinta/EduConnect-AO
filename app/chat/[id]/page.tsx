'use client';

import { useState, useEffect, useRef, use } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, MoreVertical, Phone, Video,
  Loader2, Trash2
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { ChatInput } from '@/components/chat/chat-input';
import { uploadChatMedia, markMessagesAsSeen, getConversationDetails, deleteMessage, editMessage } from '@/lib/chat-utils';
import { MessageBubble } from '@/components/chat/message-bubble';
import type { Message, Participant, RawReaction } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function ChatRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherParticipant, setOtherParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processReactions = (rawReactions: RawReaction[]) => {
    if (!rawReactions) return [];
    const grouped: Record<string, { emoji: string; count: number; users: string[] }> = {};
    rawReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user_id);
    });
    return Object.values(grouped);
  };

  useEffect(() => {
    if (!conversationId || !user) return;

    let isMounted = true;

    async function initializeChat() {
      if (!isMounted) return;
      setLoading(true);

      try {
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const channelName = `room:${conversationId}:${Date.now()}`;

        const details = await getConversationDetails(conversationId, user!.id);
        if (isMounted) setOtherParticipant(details.otherParticipant);

        const { data: initialMsgs, error: msgsError } = await supabase
          .from('messages')
          .select('*, message_reactions(emoji, user_id)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;

        const processedMsgs: Message[] = (initialMsgs || []).map(msg => ({
          ...msg,
          reactions: processReactions(msg.message_reactions || [])
        }));

        if (isMounted) setMessages(processedMsgs);

        await markMessagesAsSeen(conversationId, user!.id);

        if (!isMounted) return;
        const channel = supabase.channel(channelName);

        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: { new: Record<string, unknown> }) => {
            if (!isMounted) return;
            const newMsg = payload.new as Message;

            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              if (newMsg.sender_id === user!.id) {
                const withoutTemp = prev.filter(m =>
                  !(m.id.startsWith('temp-') && m.content === newMsg.content)
                );
                return [...withoutTemp, { ...newMsg, reactions: [] }];
              }
              return [...prev, { ...newMsg, reactions: [] }];
            });

            if (newMsg.sender_id !== user!.id) {
              markMessagesAsSeen(conversationId, user!.id);
            }
          }
        );

        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: { new: Record<string, unknown> }) => {
            if (!isMounted) return;
            const updated = payload.new as Message;
            setMessages(prev =>
              prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m))
            );
          }
        );

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
                  const updated = data.find((d: { id: string }) => d.id === m.id);
                  return updated
                    ? { ...m, reactions: processReactions(updated.message_reactions) }
                    : m;
                })
              );
            }
          }
        );

        channel.on(
          'broadcast',
          { event: 'typing' },
          ({ payload }: { payload: { userId: string; typing: boolean; userName?: string } }) => {
            if (!isMounted) return;
            if (payload.userId !== user!.id) {
              setTypingUser(payload.typing ? (payload.userName ?? null) : null);
            }
          }
        );

        channel.subscribe();
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, typingUser]);

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
    }
  };

  const sendMediaMessage = async (file: File, type: Message['type']) => {
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
      <header className="absolute top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-200/40 px-4 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-95">
            <ChevronLeft size={24} />
          </button>
          <div 
            className="flex items-center gap-3 cursor-pointer group px-2 py-1.5 rounded-2xl hover:bg-slate-50/80 transition-all active:scale-95"
            onClick={() => router.push(otherParticipant?.user_id === user?.id ? '/profile' : `/profile/${otherParticipant?.user_id}`)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex-shrink-0 bg-slate-100 relative group-hover:scale-105 transition-transform">
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
          <button className="p-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"><Phone size={20}/></button>
          <button className="p-2.5 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"><Video size={20}/></button>
          <button className="p-2.5 rounded-full hover:bg-slate-100 hover:text-slate-800 transition-all active:scale-90"><MoreVertical size={20}/></button>
        </div>
      </header>

      {/* MESSAGES AREA */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto pt-24 pb-6 px-4 space-y-1.5 relative selection:bg-blue-100"
        style={{ 
          backgroundSize: '360px',
          backgroundRepeat: 'repeat',
          backgroundColor: '#f1f5f9'
        }}
      >
        <div className="absolute inset-0 bg-slate-50/70 pointer-events-none" />

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          const nextMsg = messages[index + 1];
          const prevMsg = messages[index - 1];

          const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;

          const showTime = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 1800000;
          const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : undefined;

          // Build the message with replied_message attached (both share the same Message type)
          const msgWithReply: Message = {
            ...msg,
            replied_message: repliedMsg
          };

          return (
            <div key={msg.id} className="relative">
              {showTime && (
                <div className="flex justify-center my-8 sticky top-2 z-10">
                  <span className="px-5 py-2 bg-white/60 backdrop-blur-xl rounded-full text-[10px] font-black text-slate-500/80 uppercase tracking-[0.2em] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white/50">
                    {new Date(msg.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              <MessageBubble 
                msg={msgWithReply}
                isMe={isMe}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                currentUserId={user?.id || ''}
                otherParticipantName={otherParticipant?.profiles?.full_name}
                onReply={(m) => setReplyTo(m)}
                onEdit={(m) => setEditingMessage(m)}
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
