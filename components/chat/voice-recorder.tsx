'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback((cancel = false) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    if (cancel) onCancel();
  }, [onCancel]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [startRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-4 bg-white/50 backdrop-blur-xl p-2.5 rounded-[32px] w-full border border-slate-100 shadow-xl"
    >
      {isRecording ? (
        <>
          <div className="flex items-center gap-3 px-4 flex-1">
            <motion.div 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
            />
            <span className="text-sm font-black text-slate-700 tracking-widest tabular-nums">{formatDuration(duration)}</span>
            <div className="flex-1 flex justify-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Gravações em curso...</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => onCancel()}
            className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
          >
            <Trash2 size={24} />
          </button>
          <button 
            type="button"
            onClick={() => stopRecording()}
            className="p-4 bg-blue-600 text-white rounded-[24px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Send size={24} />
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 px-4">
            {audioUrl && (
              <audio src={audioUrl} controls className="h-10 w-full" />
            )}
          </div>
          <button 
            type="button"
            onClick={() => onCancel()}
            className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
          >
            <Trash2 size={24} />
          </button>
          <button 
            type="button"
            onClick={() => audioBlob && onSend(audioBlob)}
            className="p-4 bg-blue-600 text-white rounded-[24px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <Send size={24} />
          </button>
        </>
      )}
    </motion.div>
  );
}
