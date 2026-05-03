'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'motion/react';
import { 
  Check, CheckCheck, Trash2, Edit2, Reply, 
  Paperclip, Smile, MoreVertical,
  Play, Pause, Mic
} from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { PollMessage } from './poll-message';
import { Message } from '@/lib/chat-types';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

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
}

function MessageVisual({ msg, isMe, isFirstInGroup, isLastInGroup, otherParticipantName, currentUserId }: {

  msg: Message;

  isMe: boolean;

  isFirstInGroup: boolean;

  isLastInGroup: boolean;

  otherParticipantName?: string;

  currentUserId: string;

}) {

  const bubbleBase = `relative max-w-[75%] sm:max-w-[68%] select-none break-words`;

  const bubbleIsMe = `bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm hover:shadow-md

    ${isFirstInGroup ? 'rounded-[20px] rounded-tr-[5px]' : 'rounded-[20px]'}

    ${!isLastInGroup ? 'rounded-br-[8px]' : ''}`;

  const bubbleOther = `bg-white text-slate-800 border border-slate-100 shadow-sm hover:shadow-md

    ${isFirstInGroup ? 'rounded-[20px] rounded-tl-[5px]' : 'rounded-[20px]'}

    ${!isLastInGroup ? 'rounded-bl-[8px]' : ''}`;

  const hasReactions = msg.reactions && msg.reactions.length > 0;

  return (

    <div className={`${bubbleBase} ${isMe ? bubbleIsMe : bubbleOther} scale-105 shadow-2xl`}>

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

      <div className="px-3.5 py-2">

        {msg.deleted_at ? (

          <p className="italic opacity-50 flex items-center gap-2 py-0.5 text-sm">

            <Trash2 size={13} /> Mensagem apagada

          </p>

        ) : (

          <>

            {msg.type === 'text' && (

              <p className="leading-relaxed whitespace-pre-wrap text-[15px] font-medium break-words">{msg.content}</p>

            )}

            {msg.type === 'image' && (

              <div className="rounded-xl overflow-hidden mb-1 -mx-1">

                <Image src={msg.media_url!} alt="Imagem" width={400} height={300} className="w-full h-auto max-h-72 object-cover" unoptimized />

              </div>

            )}

            {msg.type === 'video' && (

              <div className="rounded-xl overflow-hidden mb-1 bg-black -mx-1">

                <video src={msg.media_url} controls className="w-full max-h-72" />

              </div>

            )}

            {(msg.type === 'voice' || msg.type === 'audio') && msg.media_url && (

              <TelegramVoicePlayer src={msg.media_url} isMe={isMe} />

            )}

            {msg.type === 'file' && (

              <a href={msg.media_url} target="_blank" rel="noopener noreferrer"

                className={`flex items-center gap-3 p-3 rounded-xl -mx-1 transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-50 hover:bg-slate-100'}`}>

                <Paperclip size={20} className={isMe ? 'text-white/80' : 'text-blue-600'} />

                <div className="text-sm truncate">

                  <p className="font-bold">Ficheiro</p>

                  <p className="opacity-60 text-[10px]">Baixar</p>

                </div>

              </a>

            )}

            {msg.type === 'poll' && msg.poll_data && (

              <PollMessage messageId={msg.id} pollData={msg.poll_data} isMe={isMe} />

            )}

          </>

        )}

        {/* Time */}

        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>

          {msg.updated_at && !msg.deleted_at && (

            <span className="text-[9px] italic opacity-75 mr-1">editada</span>

          )}

          <span className="text-[10px] font-bold">

            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

          </span>

          {isMe && !msg.deleted_at && (

            <span className="ml-0.5">

              {msg.seen_at ? <CheckCheck size={14} /> : <Check size={14} className="opacity-50" />}

            </span>

          )}

        </div>

        {/* Reactions */}

        {hasReactions && (

          <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>

            {msg.reactions!.map((r, i) => (

              <button key={i} onClick={() => {}} // disabled in clone

                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[13px] border bg-white shadow-sm transition-all active:scale-90 ${

                  r.users.includes(currentUserId) ? 'border-blue-300 bg-blue-50' : 'border-slate-100'

                }`}>

                {r.emoji}

                {r.count > 1 && <span className="text-[10px] font-black text-slate-600 ml-0.5">{r.count}</span>}

              </button>

            ))}

          </div>

        )}

      </div>

    </div>

  );

}

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
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          const a = audioRef.current!;
          setCurrentTime(a.currentTime);
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current!.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
      />
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {playing
          ? <Pause size={18} className="text-white" fill="white" />
          : <Play size={18} className="text-white" fill="white" style={{ marginLeft: 2 }} />
        }
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className={`relative h-1.5 rounded-full cursor-pointer overflow-hidden ${isMe ? 'bg-white/25' : 'bg-slate-200'}`}
          onClick={handleSeek}
        >
          <div
            className={`absolute left-0 top-0 h-full rounded-full ${isMe ? 'bg-white' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
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

export function MessageBubble({ 
  msg, isMe, isFirstInGroup, isLastInGroup, 
  onReply, onEdit, onDelete, onReact,
  otherParticipantName, currentUserId, resetPosition,
  activeMessageId, setActiveMessageId
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();
  const replyOpacity = useTransform(x, isMe ? [-60, 0] : [0, 60], [1, 0]);
  const replyScale = useTransform(x, isMe ? [-60, 0] : [0, 60], [1.2, 0.8]);

  const messageRef = useRef<HTMLDivElement>(null);
  const [messageRect, setMessageRect] = useState<any>(null);
  const portalRoot = typeof document !== 'undefined' ? document.getElementById('portal-root') : null;

  const isActive = activeMessageId === msg.id;

  const handleActivate = () => {
    const rect = messageRef.current?.getBoundingClientRect();
    if (rect) {
      setMessageRect(rect);
      setActiveMessageId(msg.id);
    }
  };

  const handleClose = useCallback(() => {
    setActiveMessageId(null);
  }, [setActiveMessageId]);

  useEffect(() => {
    if (resetPosition !== undefined) {
      controls.start({ x: 0 });
    }
  }, [resetPosition, controls]);

  const handlePressStart = () => {
    pressTimerRef.current = setTimeout(() => {
      setActiveMessageId(msg.id);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      handleClose();
    } else {
      handleActivate();
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    setIsSwiping(false);
    const threshold = 60;
    const triggered = isMe ? info.offset.x < -threshold : info.offset.x > threshold;
    if (triggered) onReply(msg);
    controls.start({ x: 0 });
    setActiveMessageId(null); // Close active message on swipe
  };

  const hasReactions = msg.reactions && msg.reactions.length > 0;

  const bubbleBase = `relative max-w-[75%] sm:max-w-[68%] select-none break-words`;
  const bubbleIsMe = `bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm hover:shadow-md
    ${isFirstInGroup ? 'rounded-[20px] rounded-tr-[5px]' : 'rounded-[20px]'}
    ${!isLastInGroup ? 'rounded-br-[8px]' : ''}`;
  const bubbleOther = `bg-white text-slate-800 border border-slate-100 shadow-sm hover:shadow-md
    ${isFirstInGroup ? 'rounded-[20px] rounded-tl-[5px]' : 'rounded-[20px]'}
    ${!isLastInGroup ? 'rounded-bl-[8px]' : ''}`;

  return (
    <div
      ref={wrapperRef}
      className={`group relative ${isActive ? 'z-[60]' : 'z-10'} flex w-full items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onClick={handleClick}
    >
      {/* Swipe indicator */}
      {!msg.deleted_at && isSwiping && (
        <motion.div
          style={{ opacity: replyOpacity, scale: replyScale }}
          className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none`}
        >
          <Reply size={22} className="stroke-[3]" />
        </motion.div>
      )}

      <motion.div
        ref={messageRef}
        drag={!msg.deleted_at ? 'x' : false}
        dragConstraints={{ left: isMe ? -100 : 0, right: isMe ? 0 : 100 }}
        dragElastic={0.2}
        onDragStart={() => {
          setIsSwiping(true);
          setActiveMessageId(null);
        }}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`${bubbleBase} ${isMe ? bubbleIsMe : bubbleOther} transition-transform duration-200`}
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

        <div className="px-3.5 py-2">
          {msg.deleted_at ? (
            <p className="italic opacity-50 flex items-center gap-2 py-0.5 text-sm">
              <Trash2 size={13} /> Mensagem apagada
            </p>
          ) : (
            <>
              {msg.type === 'text' && (
                <p className="leading-relaxed whitespace-pre-wrap text-[15px] font-medium break-words">{msg.content}</p>
              )}
              {msg.type === 'image' && (
                <div className="rounded-xl overflow-hidden mb-1 -mx-1">
                  <Image src={msg.media_url!} alt="Imagem" width={400} height={300} className="w-full h-auto max-h-72 object-cover" unoptimized />
                </div>
              )}
              {msg.type === 'video' && (
                <div className="rounded-xl overflow-hidden mb-1 bg-black -mx-1">
                  <video src={msg.media_url} controls className="w-full max-h-72" />
                </div>
              )}
              {(msg.type === 'voice' || msg.type === 'audio') && msg.media_url && (
                <TelegramVoicePlayer src={msg.media_url} isMe={isMe} />
              )}
              {msg.type === 'file' && (
                <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3 rounded-xl -mx-1 transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-50 hover:bg-slate-100'}`}>
                  <Paperclip size={20} className={isMe ? 'text-white/80' : 'text-blue-600'} />
                  <div className="text-sm truncate">
                    <p className="font-bold">Ficheiro</p>
                    <p className="opacity-60 text-[10px]">Baixar</p>
                  </div>
                </a>
              )}
              {msg.type === 'poll' && msg.poll_data && (
                <PollMessage messageId={msg.id} pollData={msg.poll_data} isMe={isMe} />
              )}
            </>
          )}

          {/* Time */}
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
            {msg.updated_at && !msg.deleted_at && (
              <span className="text-[9px] italic opacity-75 mr-1">editada</span>
            )}
            <span className="text-[10px] font-bold">
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && !msg.deleted_at && (
              <span className="ml-0.5">
                {msg.seen_at ? <CheckCheck size={14} /> : <Check size={14} className="opacity-50" />}
              </span>
            )}
          </div>

          {/* Reactions */}
          {hasReactions && (
            <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {msg.reactions!.map((r, i) => (
                <button key={i} onClick={() => onReact(msg.id, r.emoji)}
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[13px] border bg-white shadow-sm transition-all active:scale-90 ${
                    r.users.includes(currentUserId) ? 'border-blue-300 bg-blue-50' : 'border-slate-100'
                  }`}>
                  {r.emoji}
                  {r.count > 1 && <span className="text-[10px] font-black text-slate-600 ml-0.5">{r.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Portal overlay */}
      {isActive && portalRoot && createPortal(
        <div
          className="fixed inset-0 backdrop-blur-md bg-black/10 z-40 transition-opacity duration-200"
          onClick={handleClose}
        />,
        portalRoot
      )}

      {/* Portal message clone */}
      {isActive && portalRoot && createPortal(
        <div
          style={{
            position: "fixed",
            top: messageRect?.top || 0,
            left: messageRect?.left || 0,
            width: messageRect?.width || 0
          }}
          className="z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageVisual
            msg={msg}
            isMe={isMe}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            otherParticipantName={otherParticipantName}
            currentUserId={currentUserId}
          />
        </div>,
        portalRoot
      )}

      {/* Portal reactions */}
      {isActive && portalRoot && createPortal(
        <div
          style={{
            position: "fixed",
            top: (messageRect?.top || 0) - 50,
            left: Math.max(20, Math.min((messageRect?.left || 0) + (messageRect?.width || 0) / 2, window.innerWidth - 140)),
            transform: "translateX(-50%)"
          }}
          className="bg-white rounded-full shadow-xl px-3 py-1 flex gap-2 z-50"
        >
          {["👍","❤️","😂","🔥"].map(emoji => (
            <button key={emoji} onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); handleClose(); }}>
              {emoji}
            </button>
          ))}
        </div>,
        portalRoot
      )}

      {/* Portal menu */}
      {isActive && portalRoot && createPortal(
        <div
          style={{
            position: "fixed",
            top: (messageRect?.top || 0) + (messageRect?.height || 0) + 10,
            left: Math.max(20, Math.min((messageRect?.left || 0) + (messageRect?.width || 0) / 2, window.innerWidth - 140)),
            transform: "translateX(-50%)"
          }}
          className="bg-white rounded-lg shadow-xl p-2 flex flex-col z-50 min-w-[140px]"
        >
          {[
            { icon: Reply, label: 'Responder', onClick: () => onReply(msg), color: 'text-slate-700' },
            { icon: Edit2, label: 'Editar', onClick: () => onEdit(msg), color: 'text-slate-700', hide: !isMe || msg.type !== 'text' },
            { icon: Trash2, label: 'Apagar', onClick: () => onDelete(msg.id), color: 'text-red-500' },
          ].filter(item => !item.hide).map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                handleClose();
              }}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-slate-50 transition-colors rounded ${item.color}`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>,
        portalRoot
      )}
    </div>
  );
}
