'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Plus, Smile, Image as ImageIcon, Video, Mic, X, 
  Loader2, BarChart2, Paperclip, Music, Edit2, Reply
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker from 'emoji-picker-react';
import { VoiceRecorder } from './voice-recorder';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onSendMedia: (file: File, type: any) => void;
  onSendPoll: (question: string, options: string[]) => void;
  onSendVoice: (blob: Blob) => void;
  replyTo?: any;
  onCancelReply?: () => void;
  editingMessage?: any;
  onCancelEdit?: () => void;
}

export function ChatInput({ 
  onSendMessage, onSendMedia, onSendPoll, onSendVoice, 
  replyTo, onCancelReply, editingMessage, onCancelEdit 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ file: File, url: string, type: string } | null>(null);
  
  // Update message when editing starts
  useEffect(() => {
    if (editingMessage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(editingMessage.content || '');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('');
    }
  }, [editingMessage]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  
  // Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (mediaPreview) {
      onSendMedia(mediaPreview.file, mediaPreview.type);
      setMediaPreview(null);
      return;
    }

    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    setMediaPreview({
      file,
      url: URL.createObjectURL(file),
      type
    });
    
    setShowPlusMenu(false);
  };

  return (
    <div className="relative border-t border-slate-100/50 bg-white/95 backdrop-blur-3xl pb-8 pt-4 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.02)]">
      
      {/* File Preview Card */}
      <AnimatePresence>
        {mediaPreview && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 mx-2 bg-white rounded-[28px] border border-slate-100 shadow-xl p-3 flex flex-col gap-3"
          >
            <div className="relative aspect-video rounded-[20px] overflow-hidden bg-slate-50 border border-slate-100">
               {mediaPreview.type === 'image' && <Image src={mediaPreview.url} alt="Preview" fill className="object-cover" unoptimized />}
               {mediaPreview.type === 'video' && <video src={mediaPreview.url} className="w-full h-full object-cover" />}
               {mediaPreview.type === 'audio' && <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600"><Music size={48} /></div>}
               {mediaPreview.type === 'file' && <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400"><Paperclip size={48} /></div>}
               
               <button 
                onClick={() => setMediaPreview(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
               >
                 <X size={18} />
               </button>
            </div>
            <div className="flex items-center justify-between px-2">
               <div className="flex-1 min-w-0 mr-4">
                 <p className="text-xs font-black text-slate-800 uppercase tracking-widest truncate">{mediaPreview.file.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold">{(mediaPreview.file.size / 1024 / 1024).toFixed(2)} MB</p>
               </div>
               <button 
                 onClick={handleSend}
                 className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100"
               >
                 Enviar
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply/Edit Header */}
      <AnimatePresence>
        {(replyTo || editingMessage) && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: 15 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 15 }}
            className="mb-4 mx-2 p-3.5 bg-slate-50/50 backdrop-blur-xl rounded-[26px] flex items-center gap-4 border border-slate-100/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 shadow-sm">
              {editingMessage ? <Edit2 size={22} className="stroke-[2.5]" /> : <Reply size={22} className="stroke-[2.5]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
                {editingMessage ? 'Modo de Edição' : 'Respondendo a'}
              </p>
              <p className="text-[13.5px] text-slate-500 truncate font-semibold leading-none tracking-tight">
                {(editingMessage || replyTo)?.content || ((editingMessage || replyTo)?.type === 'image' ? 'Imagem' : 'Media')}
              </p>
            </div>
            <button 
              onClick={() => editingMessage ? onCancelEdit?.() : onCancelReply?.()}
              className="p-2.5 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-all duration-300 active:scale-90"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus Menu */}
      <AnimatePresence>
        {showPlusMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlusMenu(false)}
              className="fixed inset-0 z-40 bg-black/5"
            />
            <motion.div 
              initial={{ y: 25, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 25, opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="absolute bottom-full left-4 mb-5 bg-white/90 backdrop-blur-3xl rounded-[36px] shadow-[0_25px_60px_rgba(0,123,255,0.18)] border border-blue-50/50 p-3.5 grid grid-cols-2 gap-2.5 z-50 w-[300px]"
            >
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2.5 p-5 rounded-[28px] hover:bg-blue-50/80 transition-all duration-500 group active:scale-95"
              >
                <div className="w-14 h-14 rounded-[22px] bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                  <ImageIcon size={28} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-600">Galeria</span>
              </button>
              <button 
                onClick={() => { setShowPollCreator(true); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-2.5 p-5 rounded-[28px] hover:bg-green-50/80 transition-all duration-500 group active:scale-95"
              >
                <div className="w-14 h-14 rounded-[22px] bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-sm">
                  <BarChart2 size={28} className="stroke-[2]" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-green-600">Sondagem</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 max-w-6xl mx-auto">
        <div className="flex items-center">
          <button 
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`p-3.5 rounded-full transition-all duration-500 shadow-sm active:scale-90 ${showPlusMenu ? 'bg-blue-600 text-white rotate-[135deg] shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          >
            <Plus size={26} className="stroke-[2.5]" />
          </button>
        </div>

        <div className="flex-1 flex items-center bg-slate-100/50 border border-slate-200/40 rounded-[30px] px-3.5 py-2 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:bg-white focus-within:border-blue-500/20 transition-all duration-500 shadow-inner">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 transition-all duration-300 hover:scale-110 active:scale-90 ${showEmojiPicker ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
          >
            <Smile size={24} className="stroke-[2]" />
          </button>
          
          <form onSubmit={handleSend} className="flex-1">
            <input 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={editingMessage ? "" : "Diz algo inspirador..."}
              className="w-full bg-transparent border-none focus:ring-0 text-[15.5px] font-semibold placeholder:text-slate-400 py-3 px-1 transition-all"
            />
          </form>

          <input 
            type="file" 
            hidden 
            ref={fileInputRef} 
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
        </div>

        {message.trim() || editingMessage ? (
          <motion.button 
            initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSend()}
            className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_12px_24px_rgba(37,99,235,0.25)] hover:shadow-[0_15px_30px_rgba(37,99,235,0.35)] transition-all duration-300"
          >
            <Send size={24} className="ml-0.5 stroke-[2.5]" />
          </motion.button>
        ) : (
          <motion.button 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsRecording(true)}
            className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 hover:text-blue-600 transition-all duration-500 shadow-sm border border-slate-100 active:scale-95"
          >
            <Mic size={24} className="stroke-[2]" />
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.95 }}
              className="absolute bottom-full left-4 mb-5 z-50 shadow-[0_30px_60px_rgba(0,0,0,0.15)] rounded-[32px] overflow-hidden border border-slate-100"
            >
               <EmojiPicker 
                onEmojiClick={(emoji) => setMessage(prev => prev + emoji.emoji)}
                width={360}
                height={450}
                previewConfig={{ showPreview: false }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-[110] bg-white/90 backdrop-blur-3xl p-6 border-t border-slate-100 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
          >
             <VoiceRecorder 
              onSend={(blob) => {
                onSendVoice(blob);
                setIsRecording(false);
              }}
              onCancel={() => setIsRecording(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
