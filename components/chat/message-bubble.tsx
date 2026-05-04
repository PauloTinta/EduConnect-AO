'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';
import {
  Check, CheckCheck, Trash2, Edit2, Reply,
  Paperclip, Play, Pause, Mic
} from 'lucide-react';
import Image from 'next/image';
import { PollMessage } from './poll-message';
import { Message } from '@/lib/chat-types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥'];

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  otherParticipantName?: string;
  currentUserId: string;
  resetPosition?: number;
  activeMessageId: string | null;
  setActiveMessageId: (id: string | null) => void;
  isPreview?: boolean;
  onOpenActions?: (msg: Message) => void;
}

/* ─── Player de voz ─── */
function TelegramVoicePlayer({ src, isMe }: { src: string; isMe: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }, [playing]);

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * audio.duration;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px] py-1">
      <audio ref={audioRef} src={src}
        onTimeUpdate={() => {
          const a = audioRef.current!;
          setCurrentTime(a.currentTime);
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current!.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
      />
      <button onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-500 hover:bg-blue-600'
        }`}>
        {playing ? <Pause size={18} className="text-white" fill="white" /> : <Play size={18} className="text-white" fill="white" style={{ marginLeft: 2 }} />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className={`relative h-1.5 rounded-full cursor-pointer overflow-hidden ${isMe ? 'bg-white/25' : 'bg-slate-200'}`} onClick={handleSeek}>
          <div className={`absolute left-0 top-0 h-full rounded-full ${isMe ? 'bg-white' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center gap-1">
          <Mic size={10} className={isMe ? 'text-blue-100 opacity-70' : 'text-slate-400'} />
          <span className={`text-[10px] font-bold tabular-nums ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
            {playing ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════ */
export function MessageBubble({
  msg, isMe, isFirstInGroup, isLastInGroup,
  onReply, onEdit, onDelete, onReact,
  otherParticipantName, currentUserId, resetPosition,
  activeMessageId, setActiveMessageId,
  isPreview = false,
  onOpenActions,
}: MessageBubbleProps) {
  /* ─── Se a mensagem foi deletada, não renderiza nada (Telegram behavior) ─── */
  if (msg.deleted_at) return null;

  const messageRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ─── Swipe para responder ───
  const x = useMotionValue(0);
  const controls = useAnimation();
  const replyOpacity = useTransform(x, isMe ? [-60, 0] : [0, 60], [1, 0]);
  const replyScale = useTransform(x, isMe ? [-60, 0] : [0, 60], [1.2, 0.8]);
  const [isSwiping, setIsSwiping] = useState(false);

  // ─── Barra flutuante (desktop) ───
  const [messageRect, setMessageRect] = useState<DOMRect | null>(null);
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('portal-root') : null;

  // Detecta dispositivo touch
  const isTouchDevice = useRef(false);
  useEffect(() => {
    const handler = () => { isTouchDevice.current = true; };
    window.addEventListener('touchstart', handler, { once: true });
    return () => window.removeEventListener('touchstart', handler);
  }, []);

  const isActiveBar = activeMessageId === msg.id && !isPreview;

  // ─── Reset de swipe ───
  useEffect(() => {
    if (resetPosition !== undefined) {
      controls.start({ x: 0 });
    }
  }, [resetPosition, controls]);

  // ─── Swipe end ───
  const handleDragEnd = useCallback((_: any, info: any) => {
    setIsSwiping(false);
    const threshold = 60;
    const triggered = isMe ? info.offset.x < -threshold : info.offset.x > threshold;
    if (triggered) onReply(msg);
    controls.start({ x: 0 });
    setActiveMessageId(null);
  }, [isMe, msg, onReply, controls, setActiveMessageId]);

  // ════ Long press para mobile ════
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = useCallback(() => {
    if (isPreview) return;
    pressTimer.current = setTimeout(() => {
      onOpenActions?.(msg);
    }, 450);
  }, [msg, onOpenActions, isPreview]);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  // ════ Desktop: clique simples / direito ════
  const openFloatingBar = useCallback((rect?: DOMRect) => {
    if (isTouchDevice.current || isPreview) return;
    const r = rect || messageRef.current?.getBoundingClientRect();
    if (r) {
      setMessageRect(r);
      setActiveMessageId(msg.id);
    }
  }, [msg.id, setActiveMessageId, isPreview]);

  const closeFloatingBar = useCallback(() => {
    setActiveMessageId(null);
  }, [setActiveMessageId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPreview || isTouchDevice.current) return;
    e.stopPropagation();
    if (isActiveBar) {
      closeFloatingBar();
    } else {
      openFloatingBar();
    }
  }, [isPreview, isActiveBar, closeFloatingBar, openFloatingBar]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isPreview) return;
    e.preventDefault();
    if (!isTouchDevice.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      openFloatingBar(rect);
    }
  }, [isPreview, openFloatingBar]);

  // ESC fecha barra flutuante
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMessageId === msg.id) {
        setActiveMessageId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeMessageId, msg.id, setActiveMessageId]);

  // ════ Classes da bolha ════
  const bubbleBase = `relative select-none break-words ${
    isPreview ? 'max-w-full' : 'max-w-[75%] sm:max-w-[68%]'
  }`;
  const bubbleMe = `bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-md
    ${isFirstInGroup ? 'rounded-[20px] rounded-tr-[5px]' : 'rounded-[20px]'}
    ${!isLastInGroup && !isPreview ? 'rounded-br-[8px]' : ''}`;
  const bubbleOther = `bg-gradient-to-br from-white to-slate-50 text-slate-800 shadow-sm hover:shadow-md
    ${isFirstInGroup ? 'rounded-[20px] rounded-tl-[5px]' : 'rounded-[20px]'}
    ${!isLastInGroup && !isPreview ? 'rounded-bl-[8px]' : ''}`;

  // Badge de hora (WhatsApp style)
  const TimeStamp = () => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
      isMe ? 'text-blue-200/80' : 'text-slate-400/80'
    }`}>
      {msg.updated_at && !msg.deleted_at && <span className="italic text-[9px]">edit</span>}
      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      {isMe && !msg.deleted_at && (
        <span className="ml-0.5">
          {msg.seen_at ? <CheckCheck size={12} /> : <Check size={12} className="opacity-50" />}
        </span>
      )}
    </span>
  );

  // ════ Barra flutuante (desktop) ════
  const renderFloatingBar = () => {
    if (!isActiveBar || !messageRect || !portalRoot || isPreview) return null;
    const top = Math.max(10, messageRect.top - 70);
    const left = Math.min(Math.max(20, messageRect.left + messageRect.width / 2), window.innerWidth - 140);

    return (
      <div style={{ position: 'fixed', top, left, transform: 'translateX(-50%)', zIndex: 1000 }} className="flex flex-col gap-2">
        <div className="bg-white rounded-full shadow-xl px-3 py-1 flex gap-2">
          {QUICK_REACTIONS.map(emoji => (
            <button key={emoji} onClick={() => { onReact(msg.id, emoji); closeFloatingBar(); }}
              className="text-lg active:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-lg flex gap-1 px-3 py-2">
          {[
            { icon: Reply, label: 'Responder', onClick: () => { onReply(msg); closeFloatingBar(); }, color: 'text-slate-700' },
            { icon: Edit2, label: 'Editar', onClick: () => { onEdit(msg); closeFloatingBar(); }, color: 'text-slate-700', hide: !isMe || msg.type !== 'text' },
            { icon: Trash2, label: 'Apagar', onClick: () => { onDelete(msg.id); closeFloatingBar(); }, color: 'text-red-500' },
          ].filter(item => !item.hide).map((item, i) => (
            <button key={i} onClick={item.onClick}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-slate-50 rounded ${item.color}`}>
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ════ RENDER ════
  return (
    <>
      {/* Wrapper sem pointer-events-none */}
      <div
        ref={wrapperRef}
        className={`flex w-full items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${
          isFirstInGroup ? 'mt-4' : 'mt-0.5'
        }`}
      >
        {/* Indicador de swipe */}
        {!isPreview && isSwiping && (
          <motion.div
            style={{ opacity: replyOpacity, scale: replyScale }}
            className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none`}
          >
            <Reply size={22} className="stroke-[3]" />
          </motion.div>
        )}

        {/* Bolha com posição relativa para reactions absolutas */}
        <div className="relative">
          <motion.div
            ref={messageRef}
            drag={!isPreview ? 'x' : false}
            dragConstraints={{ left: isMe ? -100 : 0, right: isMe ? 0 : 100 }}
            dragElastic={0.2}
            onDragStart={() => { setIsSwiping(true); setActiveMessageId(null); }}
            onDragEnd={handleDragEnd}
            animate={controls}
            onTouchStart={handleTouchStart}
            onTouchEnd={clearPressTimer}
            onTouchMove={clearPressTimer}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            className={`${bubbleBase} ${isMe ? bubbleMe : bubbleOther} transition-transform duration-200 ${
              isPreview ? 'pointer-events-none' : ''
            }`}
          >
            {/* Reply preview */}
            {msg.replied_message && (
              <div className={`mx-2 mt-2 mb-1 p-2 rounded-xl text-[11px] border-l-[3px] overflow-hidden ${
                isMe ? 'bg-black/15 border-white/50 text-blue-50' : 'bg-blue-50 border-blue-500 text-slate-500'
              }`}>
                <p className="font-black text-[9px] uppercase tracking-wider opacity-80 mb-0.5">
                  {msg.replied_message.sender_id === currentUserId ? 'Tu' : otherParticipantName}
                </p>
                <p className="truncate opacity-75 font-medium">{msg.replied_message.content || '📎 Mídia'}</p>
              </div>
            )}

            <div className="px-3.5 py-2 relative">
              {/* Conteúdo */}
              {msg.type === 'text' && (
                <p className="leading-relaxed text-[15px] font-medium break-words overflow-hidden">
                  {msg.content}
                  <span className="float-right ml-2 inline-flex items-center gap-1 text-[10px] font-medium leading-relaxed"
                    style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(100,116,139,0.8)' }}>
                    {msg.updated_at && !msg.deleted_at && <span className="italic text-[9px]">edit</span>}
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && !msg.deleted_at && (
                      <span className="ml-0.5">
                        {msg.seen_at ? <CheckCheck size={12} /> : <Check size={12} className="opacity-50" />}
                      </span>
                    )}
                  </span>
                  <span className="clear-both block h-0" />
                </p>
              )}
              {msg.type === 'image' && (
                <>
                  <div className="rounded-xl overflow-hidden mb-1 -mx-1">
                    <Image src={msg.media_url!} alt="Imagem" width={400} height={300} className="w-full h-auto max-h-72 object-cover" unoptimized />
                  </div>
                  <div className="flex justify-end"><TimeStamp /></div>
                </>
              )}
              {msg.type === 'video' && (
                <>
                  <div className="rounded-xl overflow-hidden mb-1 bg-black -mx-1">
                    <video src={msg.media_url} controls className="w-full max-h-72" />
                  </div>
                  <div className="flex justify-end"><TimeStamp /></div>
                </>
              )}
              {(msg.type === 'voice' || msg.type === 'audio') && msg.media_url && (
                <>
                  <TelegramVoicePlayer src={msg.media_url} isMe={isMe} />
                  <div className="flex justify-end mt-1"><TimeStamp /></div>
                </>
              )}
              {msg.type === 'file' && (
                <>
                  <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl -mx-1 transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <Paperclip size={20} className={isMe ? 'text-white/80' : 'text-blue-600'} />
                    <div className="text-sm truncate">
                      <p className="font-bold">Ficheiro</p>
                      <p className="opacity-60 text-[10px]">Baixar</p>
                    </div>
                  </a>
                  <div className="flex justify-end mt-1"><TimeStamp /></div>
                </>
              )}
              {msg.type === 'poll' && msg.poll_data && (
                <>
                  <PollMessage messageId={msg.id} pollData={msg.poll_data} isMe={isMe} />
                  <div className="flex justify-end mt-1"><TimeStamp /></div>
                </>
              )}
            </div>
          </motion.div>

          {/* Reactions absolutas (se não for preview e tiver reactions) */}
          {!isPreview && msg.reactions && msg.reactions.length > 0 && (
            <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex gap-1`}>
              {msg.reactions.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onReact(msg.id, r.emoji)}
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[13px] border bg-white shadow-sm active:scale-90 ${
                    r.users.includes(currentUserId) ? 'border-blue-300 bg-blue-50' : 'border-slate-100'
                  }`}
                >
                  {r.emoji}
                  {r.count > 1 && (
                    <span className="text-[10px] font-black text-slate-600 ml-0.5">{r.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {renderFloatingBar()}
    </>
  );
}
