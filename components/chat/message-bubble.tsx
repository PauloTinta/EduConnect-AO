'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Check, CheckCheck, Trash2, Edit2, Reply, 
  Paperclip, Smile, MoreVertical,
  Play, Pause, Mic
} from 'lucide-react';
import Image from 'next/image';
import { PollMessage } from './poll-message';

interface Message {
  id: string;
  sender_id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'poll';
  content?: string;
  media_url?: string;
  poll_data?: any;
  created_at: string;
  seen_at?: string;
  reply_to?: string;
  deleted_at?: string;
  updated_at?: string;
  replied_message?: Message;
  reactions?: { emoji: string; count: number; users: string[] }[];
}

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
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

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
  otherParticipantName, currentUserId 
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, isMe ? [-60, 0] : [0, 60], [1, 0]);
  const replyScale = useTransform(x, isMe ? [-60, 0] : [0, 60], [1.2, 0.8]);

  const handleDragEnd = (_: any, info: any) => {
    const triggered = isMe ? info.offset.x < -50 : info.offset.x > 50;
    if (triggered) onReply(msg);
    x.set(0);
  };

  const hasReactions = msg.reactions && msg.reactions.length > 0;

  const bubbleBase = `relative group max-w-[82%] sm:max-w-[68%] select-none`;
  const bubbleIsMe = `bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm hover:shadow-md
    ${isFirstInGroup ? 'rounded-[20px] rounded-tr-[5px]' : 'rounded-[20px]'}
    ${!isLastInGroup ? 'rounded-br-[8px]' : ''}`;
  const bubbleOther = `bg-white text-slate-800 border border-slate-100 shadow-sm hover:shadow-md
    ${isFirstInGroup ? 'rounded-[20px] rounded-tl-[5px]' : 'rounded-[20px]'}
    ${!isLastInGroup ? 'rounded-bl-[8px]' : ''}`;

  return (
    <div className={`relative flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}>
      {/* Swipe indicator */}
      {!msg.deleted_at && (
        <motion.div
          style={{ opacity: replyOpacity, scale: replyScale }}
          className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none`}
        >
          <Reply size={22} className="stroke-[3]" />
        </motion.div>
      )}

      <motion.div
        drag={!msg.deleted_at ? 'x' : false}
        dragConstraints={{ left: isMe ? -80 : 0, right: isMe ? 0 : 80 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`${bubbleBase} ${isMe ? bubbleIsMe : bubbleOther}`}
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
                <p className="leading-relaxed whitespace-pre-wrap text-[15px] font-medium">{msg.content}</p>
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

        {/* Desktop hover actions */}
        {!msg.deleted_at && (
          <div className={`absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden sm:flex items-center gap-1 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
            <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowMenu(false); }}
              className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-yellow-500 shadow-sm transition-all">
              <Smile size={16} />
            </button>
            <button onClick={() => { setShowMenu(!showMenu); setShowEmojiPicker(false); }}
              className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm transition-all">
              <MoreVertical size={16} />
            </button>
          </div>
        )}

        {/* Mobile long-press menu button */}
        {!msg.deleted_at && (
          <button onClick={() => setShowMenu(true)}
            className={`absolute -top-1 sm:hidden ${isMe ? 'right-full mr-1' : 'left-full ml-1'} w-6 h-6 rounded-full bg-white/90 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm opacity-0 active:opacity-100 transition-opacity`}>
            <MoreVertical size={12} />
          </button>
        )}

        {/* Emoji picker popup */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute bottom-full mb-2 z-[80] bg-white rounded-full shadow-xl border border-slate-100 flex items-center gap-0.5 px-2 py-1.5 ${isMe ? 'right-0' : 'left-0'}`}
            >
              <div className="fixed inset-0 z-[-1]" onClick={() => setShowEmojiPicker(false)} />
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowEmojiPicker(false); }}
                  className="w-9 h-9 rounded-full hover:bg-slate-50 flex items-center justify-center text-[20px] transition-transform active:scale-125">
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-[70]" onClick={() => setShowMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute bottom-full mb-2 w-44 bg-white rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[80] ${isMe ? 'right-0' : 'left-0'}`}
              >
                {/* Mobile emoji row */}
                <div className="flex justify-around px-2 py-2.5 border-b border-slate-50 sm:hidden">
                  {EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => { onReact(msg.id, emoji); setShowMenu(false); }}
                      className="text-[20px] active:scale-125 transition-transform">
                      {emoji}
                    </button>
                  ))}
                </div>

                {[
                  { icon: Reply, label: 'Responder', onClick: () => onReply(msg), color: 'text-slate-700' },
                  { icon: Edit2, label: 'Editar', onClick: () => onEdit(msg), color: 'text-slate-700', hide: !isMe || msg.type !== 'text' },
                  { icon: Trash2, label: 'Apagar', onClick: () => onDelete(msg.id), color: 'text-red-500' },
                ].filter(item => !item.hide).map((item, i) => (
                  <button key={i} onClick={() => { item.onClick(); setShowMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-50 ${item.color}`}>
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
