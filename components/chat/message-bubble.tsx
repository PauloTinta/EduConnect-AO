'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Check, CheckCheck, Trash2, Edit2, Reply, 
  Music, Paperclip, Smile, MoreHorizontal 
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

export function MessageBubble({ 
  msg, isMe, isFirstInGroup, isLastInGroup, 
  onReply, onEdit, onDelete, onReact,
  otherParticipantName, currentUserId 
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Swipe to reply logic
  const x = useMotionValue(0);
  const swipeThreshold = 60;
  const opacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const scale = useTransform(x, [0, swipeThreshold], [0.8, 1.2]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > swipeThreshold) {
      onReply(msg);
    }
  };

  return (
    <div className={`relative flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-6' : 'mt-0.5'}`}>
      {/* Swipe Indicator */}
      {!msg.deleted_at && (
        <motion.div 
          style={{ x, opacity, scale }}
          className="absolute left-[-40px] top-1/2 -translate-y-1/2 text-blue-600 flex flex-col items-center gap-1"
        >
          <Reply size={20} className="stroke-[3]" />
        </motion.div>
      )}

      <motion.div 
        drag={!msg.deleted_at ? "x" : false}
        dragConstraints={{ left: 0, right: 100 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative group max-w-[85%] sm:max-w-[70%] transition-all duration-300 ${
          isMe 
            ? `bg-gradient-to-br from-blue-600 to-blue-500 text-white ${isFirstInGroup ? 'rounded-[22px] rounded-tr-[4px]' : 'rounded-[22px]'} ${!isLastInGroup && 'rounded-br-[8px]'}` 
            : `bg-white text-slate-800 border border-slate-100 ${isFirstInGroup ? 'rounded-[22px] rounded-tl-[4px]' : 'rounded-[22px]'} ${!isLastInGroup && 'rounded-bl-[8px]'}`
        } shadow-sm hover:shadow-md`}
      >
        {/* Reply Info */}
        {msg.replied_message && (
          <div className={`mx-1.5 mt-1.5 mb-1 p-2 rounded-xl text-[11px] font-medium border-l-[3px] overflow-hidden ${isMe ? 'bg-black/10 border-white/50 text-blue-50' : 'bg-slate-50 border-blue-500 text-slate-500'}`}>
            <p className="font-black mb-0.5 uppercase tracking-wider text-[9px]">{msg.replied_message.sender_id === currentUserId ? 'Tu' : otherParticipantName}</p>
            <p className="truncate opacity-80">{msg.replied_message.content || 'Media'}</p>
          </div>
        )}

        <div className="px-4 py-2 relative">
          {msg.deleted_at ? (
            <p className="italic opacity-60 flex items-center gap-2 py-1 text-sm font-medium">
              <Trash2 size={14} /> Mensagem apagada
            </p>
          ) : (
            <>
              {msg.type === 'text' && <p className="leading-relaxed whitespace-pre-wrap text-[15px] font-medium">{msg.content}</p>}
              
              {msg.type === 'image' && (
                <div className="rounded-xl overflow-hidden mb-1 border border-black/5">
                  <Image src={msg.media_url!} alt="Media" width={400} height={400} className="w-full h-auto" unoptimized />
                </div>
              )}

              {msg.type === 'video' && (
                <div className="rounded-xl overflow-hidden mb-1 bg-black">
                  <video src={msg.media_url} controls className="w-full max-h-80" />
                </div>
              )}

              {(msg.type === 'audio' || msg.type === 'voice') && (
                <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[240px] ${isMe ? 'bg-white/10' : 'bg-slate-50'}`}>
                  <button className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-blue-600 text-white'}`}>
                    <Music size={18} />
                  </button>
                  <div className="flex-1 h-8 flex items-center">
                    <audio src={msg.media_url} controls className="h-8 w-full opacity-60" />
                  </div>
                </div>
              )}

              {msg.type === 'file' && (
                <a href={msg.media_url} target="_blank" className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-slate-50'} border border-transparent hover:border-blue-200 transition-colors`}>
                  <Paperclip size={20} className={isMe ? 'text-white' : 'text-blue-600'} />
                  <div className="text-sm truncate">
                    <p className="font-bold truncate">Ficheiro</p>
                    <p className="opacity-60 text-[10px]">Baixar</p>
                  </div>
                </a>
              )}

              {msg.type === 'poll' && msg.poll_data && (
                <PollMessage messageId={msg.id} pollData={msg.poll_data} isMe={isMe} />
              )}
            </>
          )}

          {/* Time and Status */}
          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider ${isMe ? 'text-blue-100/80' : 'text-slate-400'}`}>
            {msg.updated_at && !msg.deleted_at && <span className="mr-1 italic opacity-80 font-medium">(editada)</span>}
            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isMe && !msg.deleted_at && (
              <span className="ml-1">
                {msg.seen_at ? <CheckCheck size={14} className="text-blue-200" /> : <Check size={14} className="opacity-60" />}
              </span>
            )}
          </div>

          {/* Reactions Row */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className={`absolute top-full mt-[-6px] flex gap-1 z-10 ${isMe ? 'right-2' : 'left-2'}`}>
              {msg.reactions.map((reaction, i) => (
                <button 
                  key={i}
                  onClick={() => onReact(msg.id, reaction.emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border bg-white shadow-sm transition-all active:scale-90 ${reaction.users.includes(currentUserId) ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-600'}`}
                >
                  <span className="text-[12px]">{reaction.emoji}</span>
                  {reaction.count > 1 && <span className="text-[10px] font-black">{reaction.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover/Interaction Menu */}
        {!msg.deleted_at && (
          <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all"
              >
                <Smile size={18} />
              </button>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 shadow-sm transition-all"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Emoji Picker Popup */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute bottom-full mb-3 p-1.5 bg-white rounded-full shadow-xl border border-slate-100 flex gap-1 z-[70]"
                >
                  {EMOJIS.map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => { onReact(msg.id, emoji); setShowEmojiPicker(false); }}
                      className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-[18px] transition-transform active:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions Menu */}
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[65]" onClick={() => setShowMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className={`absolute bottom-full mb-3 w-40 bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[70] ${isMe ? 'right-0' : 'left-0'}`}
                  >
                    {[
                      { icon: Reply, label: 'Responder', onClick: () => onReply(msg), color: 'text-slate-600' },
                      { icon: Edit2, label: 'Editar', onClick: () => onEdit(msg), color: 'text-slate-600', hide: !isMe || msg.type !== 'text' },
                      { icon: Trash2, label: 'Apagar', onClick: () => onDelete(msg.id), color: 'text-red-500' }
                    ].filter(item => !item.hide).map((item, i) => (
                      <button 
                        key={i}
                        onClick={() => { item.onClick(); setShowMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-50 ${item.color}`}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
