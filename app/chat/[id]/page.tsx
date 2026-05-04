'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, MoreVertical, Phone, Video, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { ChatInput } from '@/components/chat/chat-input';
import { PollMessage } from '@/components/chat/poll-message';
import { MessageBubble } from '@/components/chat/message-bubble';
import {
  uploadChatMedia,
  markMessagesAsSeen,
  getConversationDetails,
  deleteMessage,
  editMessage,
} from '@/lib/chat-utils';
import { Message } from '@/lib/chat-types';

interface Participant {
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
    last_seen?: string;
  };
}

export const dynamic = 'force-dynamic';

const processReactions = (raw: any[]) => {
  if (!raw?.length) return [];
  const grouped: Record<string, { emoji: string; count: number; users: string[] }> = {};
  raw.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.user_id);
  });
  return Object.values(grouped);
};

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
  const [resetPositionCounter, setResetPositionCounter] = useState(0);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const messageIdsRef = useRef<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ⭐ Conjunto de IDs inseridos localmente para evitar duplicação
  const recentlyInsertedRef = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const handleSetActiveMessage = useCallback((id: string | null) => {
    setActiveMessageId(id);
  }, []);

  const refreshMessageReactions = useCallback(async (messageId: string) => {
    const { data } = await supabase
      .from('message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);
    if (!data) return;
    const reactions = processReactions(data);
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, reactions } : m))
    );
  }, []);

  const upsertMessage = useCallback((newMsg: Message) => {
    if (!newMsg?.id) return;
    setMessages(prev => {
      const exists = prev.find(m => m.id === newMsg.id);
      if (exists) {
        return prev.map(m =>
          m.id === newMsg.id
            ? { ...m, ...newMsg, reactions: m.reactions || [] }
            : m
        );
      }
      return [...prev, { ...newMsg, reactions: [] }];
    });
  }, []);

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    let isMounted = true;

    async function init() {
      setLoading(true);
      try {
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        const details = await getConversationDetails(conversationId, user!.id);
        if (isMounted) setOtherParticipant(details.otherParticipant);

        const { data: msgs } = await supabase
          .from('messages')
          .select('*, message_reactions(emoji, user_id)')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (isMounted) {
          setMessages(
            (msgs || []).map(m => ({ ...m, reactions: processReactions(m.message_reactions || []) }))
          );
        }

        await markMessagesAsSeen(conversationId, user!.id);

        if (!isMounted) return;

        const channel = supabase.channel(`chat-room-${conversationId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id },
          },
        });

        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            if (!isMounted) return;
            const newMsg = payload.new as Message;
            if (!newMsg?.id || newMsg.conversation_id !== conversationId) return;

            // ⭐ Ignora se acabámos de inserir localmente
            if (recentlyInsertedRef.current.has(newMsg.id)) return;

            console.log('📩 Nova mensagem realtime:', newMsg);
            upsertMessage(newMsg);

            if (newMsg.sender_id !== user!.id) {
              markMessagesAsSeen(conversationId, user!.id);
            }
          }
        );

        // Updates (edit, delete, seen)
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            if (!isMounted) return;
            const updated = payload.new as Message;
            upsertMessage(updated);
          }
        );

        // Reactions
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_reactions' },
          async (payload: any) => {
            if (!isMounted) return;
            const messageId = payload.new?.message_id || payload.old?.message_id;
            if (!messageId) return;
            queueMicrotask(() => {
              refreshMessageReactions(messageId);
            });
          }
        );

        // Typing
        channel.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
          if (!isMounted || payload.userId === user!.id) return;
          setTypingUser(payload.typing ? payload.userName : null);
          if (payload.typing) {
            setTimeout(() => {
              if (isMounted) setTypingUser(null);
            }, 3000);
          }
        });

        channel.subscribe((status: string) => {
          console.log('Realtime status:', status);
          if (status === 'SUBSCRIBED') console.log('✅ Conectado ao realtime');
          if (status === 'CHANNEL_ERROR') console.error('❌ Erro no realtime');
          if (status === 'TIMED_OUT') console.error('⏱️ Timeout realtime');
        });

        channelRef.current = channel;
      } catch (err) {
        console.error('Chat init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user]);

  useEffect(() => {
    messageIdsRef.current = messages.map(m => m.id);
    scrollToBottom();
  }, [messages, typingUser, scrollToBottom]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  const handleTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.full_name || 'Alguém',
        typing: true,
      },
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, typing: false },
      });
    }, 1200);
  }, [user]);

  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
    }
  };

  /* ✨ NOVA VERSÃO do sendTextMessage que impede duplicação */
  const sendTextMessage = async (content: string) => {
    if (!user || !conversationId) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, content).catch(console.error);
      setEditingMessage(null);
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
      reactions: [],
    };

    setMessages(prev => [...prev, tempMsg]);
    setReplyTo(null);
    scrollToBottom();

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type: 'text',
        content,
        reply_to: replyTo?.id,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return;
    }

    // ⭐ Regista o ID real para o realtime ignorar
    recentlyInsertedRef.current.add(inserted.id);
    setTimeout(() => {
      recentlyInsertedRef.current.delete(inserted.id);
    }, 5000);

    // Substitui a mensagem temporária pela real
    setMessages(prev =>
      prev.map(m => (m.id === tempId ? { ...inserted, reactions: [] } : m))
    );
  };

  const sendVoiceMessage = async (blob: Blob) => {
    if (!user || !conversationId) return;
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    try {
      const url = await uploadChatMedia(file, conversationId);
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type: 'voice',
        media_url: url,
      });
    } catch (err) {
      console.error(err);
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
        media_url: url,
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
      poll_data: { question, options },
    });
  };

  const handleDeleteMessage = async (id: string) => {
    await deleteMessage(id).catch(console.error);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#E8EDF2] overflow-hidden" style={{ zIndex: 40 }}>
      {/* HEADER */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 px-3 py-2.5 flex items-center justify-between shadow-sm z-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className="flex items-center gap-2.5 group px-2 py-1 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
            onClick={() =>
              router.push(
                otherParticipant?.user_id === user?.id
                  ? '/profile'
                  : `/profile/${otherParticipant?.user_id}`
              )
            }
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-slate-100 relative">
              <Image
                src={
                  otherParticipant?.profiles?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.profiles?.username || 'u'}`
                }
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="text-left">
              <p className="font-bold text-[15px] text-slate-800 leading-none group-hover:text-blue-600 transition-colors">
                {otherParticipant?.profiles?.full_name || 'Utilizador'}
              </p>
              <p className="text-[11px] text-green-500 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
              </p>
            </div>
          </button>
        </div>
        <div className="flex gap-1 text-slate-500">
          <button className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90">
            <Phone size={20} />
          </button>
          <button className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90">
            <Video size={20} />
          </button>
          <button className="p-2 rounded-full hover:bg-slate-100 transition-all active:scale-90">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* MESSAGES — fundo animado estilo Telegram */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative z-0 overscroll-y-contain px-2 sm:px-3 py-2 space-y-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(232,237,242,0.85), rgba(232,237,242,0.85)),
            url("https://www.transparenttextures.com/patterns/cubes.png")
          `,
          backgroundSize: 'auto, 100px',
          backgroundPosition: '0 0, 0 0',
          animation: 'bgDrift 60s linear infinite',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          const nextMsg = messages[index + 1];
          const prevMsg = messages[index - 1];
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
          const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
          const showTime =
            index === 0 ||
            new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() >
              1800000;
          const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;

          return (
            <div key={msg.id}>
              {showTime && (
                <div className="flex justify-center my-4">
                  <span className="px-4 py-1.5 bg-white/70 backdrop-blur-md rounded-full text-[10px] font-bold text-slate-500 tracking-wide shadow-sm border border-white/50">
                    {new Date(msg.created_at).toLocaleDateString('pt-AO', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' • '}
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              <MessageBubble
                msg={{ ...msg, replied_message: repliedMsg as any }}
                isMe={isMe}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                currentUserId={user?.id || ''}
                otherParticipantName={otherParticipant?.profiles?.full_name}
                onReply={setReplyTo}
                onEdit={setEditingMessage}
                onDelete={handleDeleteMessage}
                onReact={handleReact}
                resetPosition={resetPositionCounter}
                activeMessageId={activeMessageId}
                setActiveMessageId={handleSetActiveMessage}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUser && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2 mt-2 pl-2"
            >
              <div className="bg-white rounded-[18px] rounded-tl-[4px] px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">{typingUser}</span>
                <div className="flex gap-1">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* INPUT */}
      <div
        className="flex-shrink-0 bg-white border-t border-slate-100 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ChatInput
          onSendMessage={content => {
            sendTextMessage(content);
            handleTyping();
          }}
          onSendMedia={sendMediaMessage}
          onSendPoll={sendPollMessage}
          onSendVoice={sendVoiceMessage}
          replyTo={replyTo}
          onCancelReply={() => {
            setReplyTo(null);
            setResetPositionCounter(c => c + 1);
          }}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onTyping={handleTyping}
        />
      </div>

      {/* ⭐ Animação de fundo (precisa do estilo global) */}
      <style jsx>{`
        @keyframes bgDrift {
          0% {
            background-position: 0 0, 0 0;
          }
          100% {
            background-position: 0 0, 100px 100px;
          }
        }
      `}</style>
    </div>
  );
}
