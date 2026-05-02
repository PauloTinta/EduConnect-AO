'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { Search, Plus, Archive, Tag, Users, Loader2, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getUserConversations } from '@/lib/chat-utils';

export default function ChatList() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    
    async function load() {
      try {
        const data = await getUserConversations(user!.id);
        setConversations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filteredConversations = conversations.filter(c => 
    c.otherParticipant?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.otherParticipant?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 lg:ml-20 pb-16 h-screen flex flex-col bg-[#F9F9F9]">
      <TopBar showNotification={false} />
      
      <div className="flex-1 max-w-2xl mx-auto w-full bg-white lg:shadow-xl lg:my-4 lg:rounded-[32px] overflow-hidden flex flex-col border border-slate-100/50">
        
        {/* Search Header */}
        <div className="p-4 space-y-4 border-b border-slate-50 bg-white/50 backdrop-blur-md">
          <div className="flex items-center justify-between px-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Conversas</h1>
            <button className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:scale-105 transition-transform active:scale-95">
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar conversas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest">Carregando mensagens...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-12 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mb-6">
                <MessageCircle size={36} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Sem conversas ainda</h3>
              <p className="text-sm text-slate-400">Inicia uma nova conversa para começares a partilhar conhecimento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredConversations.map((chat) => (
                <motion.div 
                  key={chat.id}
                  whileTap={{ backgroundColor: '#F8FAFC', scale: 0.99 }}
                  onClick={() => router.push(`/chat/${chat.id}`)}
                  className="flex items-center gap-4 p-4 cursor-pointer group hover:bg-slate-50/50 transition-colors relative"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100 transition-transform group-hover:scale-105 duration-300">
                      <Image 
                        src={chat.otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.otherParticipant?.username || 'default'}`} 
                        alt={chat.otherParticipant?.full_name} 
                        width={56} height={56} 
                        className="object-cover" 
                        unoptimized
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="font-bold text-slate-800 text-[15px] truncate leading-tight tracking-tight">
                        {chat.otherParticipant?.full_name || 'Usuário'}
                      </h3>
                      {chat.lastMessageTime && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${chat.unreadCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`text-sm truncate leading-snug flex-1 ${chat.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}`}>
                        {chat.lastMessage || 'Nenhuma mensagem'}
                      </p>
                      
                      {chat.unreadCount > 0 && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-blue-100"
                        >
                          {chat.unreadCount}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>

      <BottomNav />
    </main>
  );
}
