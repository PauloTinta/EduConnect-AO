'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Plus, Smile, Image as ImageIcon, Mic, X, 
  Loader2, BarChart2, Paperclip, Edit2, Reply, ChevronUp
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
  onTyping?: () => void;
  replyTo?: any;
  onCancelReply?: () => void;
  editingMessage?: any;
  onCancelEdit?: () => void;
}

export function ChatInput({ 
  onSendMessage, onSendMedia, onSendPoll, onSendVoice, onTyping,
  replyTo, onCancelReply, editingMessage, onCancelEdit 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string; type: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content || '');
      textareaRef.current?.focus();
    } else {
      setMessage('');
    }
  }, [editingMessage]);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustHeight();
    onTyping?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = useCallback(async () => {
    if (isSending) return;
    if (mediaPreview) {
      setIsSending(true);
      onSendMedia(mediaPreview.file, mediaPreview.type);
      setMediaPreview(null);
      setIsSending(false);
      return;
    }
    if (!message.trim()) return;
    setIsSending(true);
    onSendMessage(message.trim());
    setMessage('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setShowEmojiPicker(false);
    setTimeout(() => setIsSending(false), 300);
  }, [message, mediaPreview, isSending, onSendMessage, onSendMedia]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    setMediaPreview({ file, url: URL.createObjectURL(file), type });
    setShowPlusMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePollSend = () => {
    const valid = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || valid.length < 2) return;
    onSendPoll(pollQuestion.trim(), valid);
    setPollQuestion(''); setPollOptions(['', '']); setShowPollCreator(false);
  };

  const canSend = message.trim().length > 0 || !!mediaPreview || !!editingMessage;

  return (
    <div className="relative">

      {/* Poll Creator */}
      <AnimatePresence>
        {showPollCreator && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowPollCreator(false)} />
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 shadow-2xl"
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <BarChart2 size={16} className="text-green-600" />
                  </div>
                  Criar Sondagem
                </h3>
                <button onClick={() => setShowPollCreator(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                placeholder="Qual é a tua pergunta?"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 mb-4" />
              <div className="space-y-2.5 mb-4">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 flex-shrink-0">{i + 1}</span>
                    <input value={opt} onChange={e => { const u = [...pollOptions]; u[i] = e.target.value; setPollOptions(u); }}
                      placeholder={`Opção ${i + 1}`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(p => p.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-400"><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 5 && (
                <button onClick={() => setPollOptions(p => [...p, ''])}
                  className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-black text-slate-400 hover:border-blue-300 hover:text-blue-500 mb-4">
                  + Adicionar opção
                </button>
              )}
              <button onClick={handlePollSend}
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95 transition-all">
                Publicar Sondagem
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Media Preview */}
      <AnimatePresence>
        {mediaPreview && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-100">
            <div className="p-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 max-h-48 flex items-center justify-center">
                {mediaPreview.type === 'image' && (
                  <Image src={mediaPreview.url} alt="Preview" width={400} height={200} className="w-full h-48 object-cover" unoptimized />
                )}
                {mediaPreview.type === 'video' && <video src={mediaPreview.url} className="w-full h-48 object-cover" />}
                {(mediaPreview.type === 'audio' || mediaPreview.type === 'file') && (
                  <div className="w-full h-20 flex flex-col items-center justify-center gap-2">
                    <p className="text-xs font-bold text-slate-600 truncate px-4">{mediaPreview.file.name}</p>
                  </div>
                )}
                <button onClick={() => setMediaPreview(null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply / Edit Banner */}
      <AnimatePresence>
        {(replyTo || editingMessage) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${editingMessage ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className={`w-1 h-8 rounded-full flex-shrink-0 ${editingMessage ? 'bg-amber-400' : 'bg-blue-500'}`} />
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${editingMessage ? 'bg-amber-100' : 'bg-blue-100'}`}>
                {editingMessage ? <Edit2 size={14} className="text-amber-600" /> : <Reply size={14} className="text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest ${editingMessage ? 'text-amber-600' : 'text-blue-600'}`}>
                  {editingMessage ? 'Editar mensagem' : 'Responder'}
                </p>
                <p className="text-xs text-slate-500 truncate font-medium mt-0.5">
                  {(editingMessage || replyTo)?.content || 'Mídia'}
                </p>
              </div>
              <button onClick={() => editingMessage ? onCancelEdit?.() : onCancelReply?.()}
                className="p-1.5 hover:bg-white/80 rounded-full text-slate-400 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus Menu */}
      <AnimatePresence>
        {showPlusMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPlusMenu(false)} className="fixed inset-0 z-40" />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute bottom-full left-3 mb-3 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-3 grid grid-cols-2 gap-2 z-50 w-[200px]"
            >
              <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-blue-50 transition-all group active:scale-95">
                <div className="w-10 h-10 bg-blue-100 rounded-[14px] flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <ImageIcon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Galeria</span>
              </button>
              <button onClick={() => { setShowPollCreator(true); setShowPlusMenu(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-green-50 transition-all group active:scale-95">
                <div className="w-10 h-10 bg-green-100 rounded-[14px] flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                  <BarChart2 size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sondagem</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Input Row */}
      <div className="flex items-end gap-2 px-3 py-2.5">
        <motion.button whileTap={{ scale: 0.88 }}
          onClick={() => { setShowPlusMenu(!showPlusMenu); setShowEmojiPicker(false); }}
          className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            showPlusMenu ? 'bg-blue-600 text-white rotate-45' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}>
          <Plus size={20} strokeWidth={2.5} />
        </motion.button>

        <div className={`flex-1 flex items-end gap-1.5 rounded-[22px] px-3 py-2 transition-all min-w-0 ${
          message.trim() ? 'bg-white border-2 border-blue-100 shadow-sm' : 'bg-slate-100'
        }`}>
          <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowPlusMenu(false); }}
            className={`flex-shrink-0 p-1.5 rounded-xl transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`}>
            <Smile size={20} />
          </button>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? 'Editar mensagem...' : 'Mensagem...'}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] font-medium text-slate-800 placeholder:text-slate-400 py-0.5 leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '120px' }}
          />
        </div>

        <AnimatePresence mode="wait">
          {canSend ? (
            <motion.button key="send"
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }} whileTap={{ scale: 0.88 }}
              onClick={handleSend} disabled={isSending}
              className="flex-shrink-0 w-9 h-9 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 transition-all">
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} className="ml-0.5 -mt-0.5" />}
            </motion.button>
          ) : (
            <motion.button key="mic"
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }} whileTap={{ scale: 0.88 }}
              onClick={() => setIsRecording(true)}
              className="flex-shrink-0 w-9 h-9 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all">
              <Mic size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              className="absolute bottom-full left-0 right-0 z-50 px-3 mb-2">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
                <EmojiPicker
                  onEmojiClick={(emoji) => {
                    setMessage(p => p + emoji.emoji);
                    textareaRef.current?.focus();
                  }}
                  width="100%" height={320}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice Recorder */}
      <AnimatePresence>
        {isRecording && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
            className="fixed inset-x-0 bottom-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-2xl p-5"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <VoiceRecorder
              onSend={(blob) => { onSendVoice(blob); setIsRecording(false); }}
              onCancel={() => setIsRecording(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
