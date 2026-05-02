'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PollData {
  question: string;
  options: string[];
}

interface PollMessageProps {
  messageId: string;
  pollData: PollData;
  isMe: boolean;
}

export function PollMessage({ messageId, pollData, isMe }: PollMessageProps) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<any[]>([]);
  const [userVote, setUserVote] = useState<number | null>(null);

  const loadVotes = useCallback(async () => {
    const { data } = await supabase
      .from('poll_votes')
      .select('user_id, option_index')
      .eq('message_id', messageId);
    
    if (data) {
      setVotes(data);
      const myVote = data.find(v => v.user_id === user?.id);
      if (myVote) setUserVote(myVote.option_index);
    }
  }, [messageId, user?.id]);

  useEffect(() => {
    (async () => {
      await loadVotes();
    })();
    
    const channel = supabase
      .channel(`poll:${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'poll_votes',
        filter: `message_id=eq.${messageId}`
      }, () => {
        loadVotes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, loadVotes]);

  async function handleVote(index: number) {
    if (!user) return;
    
    if (userVote === index) {
      // Remove vote
      await supabase.from('poll_votes').delete().match({ message_id: messageId, user_id: user.id });
    } else {
      // Add or Update vote
      await supabase.from('poll_votes').upsert({
        message_id: messageId,
        user_id: user.id,
        option_index: index
      });
    }
    loadVotes();
  }

  const totalVotes = votes.length;
  const getPercentage = (index: number) => {
    if (totalVotes === 0) return 0;
    const count = votes.filter(v => v.option_index === index).length;
    return Math.round((count / totalVotes) * 100);
  };

  return (
    <div className={`space-y-4 min-w-[260px] p-2 rounded-2xl ${isMe ? 'bg-white/5' : 'bg-slate-50/30'}`}>
      <div className="flex items-center gap-3 mb-1 px-1">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-blue-600 text-white shadow-sm'}`}>
          <BarChart2 size={16} className="stroke-[2.5]" />
        </div>
        <span className="font-bold text-[15px] tracking-tight leading-tight">{pollData.question}</span>
      </div>

      <div className="space-y-2">
        {pollData.options.map((option, i) => {
          const percentage = getPercentage(i);
          const isSelected = userVote === i;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              className="w-full relative group transition-all active:scale-[0.98]"
            >
              <div className="flex justify-between items-center mb-1 text-[11px] font-bold px-1 opacity-90">
                <span className="truncate max-w-[180px]">{option}</span>
                <span className="tabular-nums font-black">{percentage}%</span>
              </div>
              <div className={`h-9 rounded-xl overflow-hidden relative border transition-all duration-300 ${
                isMe ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white shadow-sm'
              }`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  className={`h-full absolute left-0 top-0 ${
                    isSelected 
                      ? (isMe ? 'bg-white/30' : 'bg-blue-600/20') 
                      : (isMe ? 'bg-white/10' : 'bg-slate-100')
                  }`}
                />
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -45 }}
                      >
                        <CheckCircle2 size={14} className={isMe ? 'text-white' : 'text-blue-600'} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-1 px-1">
        <p className="text-[10px] opacity-60 font-black uppercase tracking-widest">
          {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
        </p>
        <p className="text-[9px] opacity-40 font-bold italic">Toque para votar</p>
      </div>
    </div>
  );
}
