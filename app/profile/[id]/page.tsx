'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'motion/react';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { 
  BadgeCheck, 
  Flame, 
  Trophy, 
  MessageSquare, 
  Award, 
  ChevronRight, 
  Share2,
  MapPin,
  GraduationCap,
  Loader2,
  Heart,
  MessageCircle,
  Eye,
  BookOpen
} from 'lucide-react';
import Image from 'next/image';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { startConversation } from '@/lib/messaging';

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  xp: number;
  level: number;
  streak: number;
  interests: string[];
  education_level: string;
  city: string;
  country: string;
  goal: string;
}

export default function PublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { id: targetUserId } = use(params);
  
  // 🚀 Redirecionamento automático profissional
  useEffect(() => {
    if (currentUser && targetUserId === currentUser.id) {
      router.replace('/profile');
    }
  }, [currentUser, targetUserId, router]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'incoming'>('none');
  const [connectionLoading, setConnectionLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!targetUserId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();
        
        if (error) throw error;
        if (data) setProfile(data);

        // Load connection status
        if (currentUser && targetUserId !== currentUser.id) {
          const { data: conn } = await supabase
            .from('connections')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`)
            .maybeSingle();

          if (conn) {
            if (conn.status === 'accepted') {
              setConnectionStatus('accepted');
            } else if (conn.sender_id === currentUser.id) {
              setConnectionStatus('pending');
            } else {
              setConnectionStatus('incoming');
            }
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [targetUserId, currentUser]);

  const handleConnect = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    try {
      setConnectionLoading(true);
      if (connectionStatus === 'none') {
        const { error } = await supabase
          .from('connections')
          .insert({
            sender_id: currentUser.id,
            receiver_id: targetUserId,
            status: 'pending'
          });
        if (error) throw error;

        // Criar Notificação
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          from_user: currentUser.id,
          type: 'connection_request',
          message: 'enviou-te um pedido de conexão'
        });

        setConnectionStatus('pending');
      } else if (connectionStatus === 'incoming') {
        const { error } = await supabase
          .from('connections')
          .update({ status: 'accepted' })
          .eq('sender_id', targetUserId)
          .eq('receiver_id', currentUser.id);
        if (error) throw error;

        // Notificar que aceitou
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          from_user: currentUser.id,
          type: 'connection_accepted',
          message: 'aceitou o teu pedido de conexão'
        });

        setConnectionStatus('accepted');
      } else if (connectionStatus === 'pending' || connectionStatus === 'accepted') {
        // Desconectar / Cancelar
        const { error } = await supabase
          .from('connections')
          .delete()
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`);
        if (error) throw error;
        setConnectionStatus('none');
      }
    } catch (err) {
      console.error('Error connecting:', err);
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    try {
      setStartingChat(true);
      const conversationId = await startConversation(targetUserId);
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F9F9F9]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#F9F9F9] p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Usuário não encontrado</h1>
        <p className="text-slate-500 mb-6">O perfil que você está procurando não existe ou foi removido.</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white rounded-2xl font-bold">Voltar</button>
      </div>
    );
  }

  const stats = [
    { icon: Trophy, label: 'XP TOTAL', value: profile.xp?.toLocaleString('pt-PT') || '0', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Flame, label: 'STREAK', value: `${profile.streak || 0} Dias`, color: 'text-orange-500', bg: 'bg-orange-50', fill: true },
    { icon: BookOpen, label: 'NÍVEL', value: `Lvl ${profile.level || 1}`, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Award, label: 'RANKING', value: '#---', color: 'text-amber-500', bg: 'bg-amber-50', fill: true }
  ];

  return (
    <main className="flex-1 lg:ml-20 pb-24 h-full overflow-y-auto bg-[#F9F9F9]">
      <TopBar />
      
      <div className="max-w-5xl mx-auto w-full">
        {/* Top Actions */}
        <div className="flex justify-between items-center px-6 pt-6">
          <button onClick={() => router.back()} className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
            <ChevronRight size={20} className="text-slate-600 rotate-180" />
          </button>
          <div className="flex gap-3">
            <button className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
              <Share2 size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Profile Header */}
        <section className="px-6 pt-4 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl ring-8 ring-blue-50/50 relative">
              <Image 
                src={profile.avatar_url || `https://picsum.photos/seed/${profile.username}/200/200`} 
                alt={profile.full_name || "User"} 
                fill 
                className="object-cover" 
              />
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-2xl border-4 border-[#F9F9F9] shadow-lg"
            >
              <BadgeCheck size={20} fill="currentColor" />
            </motion.div>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight leading-none">
              {profile.full_name}
            </h1>
            <p className="text-blue-600 font-bold text-sm mt-2 tracking-wide uppercase opacity-70">
              @{profile.username}
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-3 text-slate-400 font-medium">
            <MapPin size={14} className="text-slate-300" />
            <span className="text-sm">
              {[profile.city, profile.country].filter(Boolean).join(', ') || 'Planeta Terra'}
            </span>
          </div>

          <div className="flex gap-3 mt-8 w-full max-w-sm">
            <button 
              onClick={handleStartConversation}
              disabled={startingChat}
              className="flex-1 bg-blue-600 text-white py-3.5 rounded-[1.5rem] font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {startingChat ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <MessageSquare size={18} />
                  Mensagem
                </>
              )}
            </button>
            
            <button 
              onClick={handleConnect}
              disabled={connectionLoading}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-[1.5rem] font-bold text-sm shadow-sm active:scale-95 transition-all ${
                connectionStatus === 'accepted'
                  ? 'bg-slate-100 text-slate-500'
                  : connectionStatus === 'pending'
                    ? 'bg-blue-50 text-blue-400'
                    : 'bg-white border border-slate-100 text-slate-800'
              }`}
            >
              {connectionLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : connectionStatus === 'accepted' ? (
                'Conectado'
              ) : connectionStatus === 'pending' ? (
                'Pendente'
              ) : connectionStatus === 'incoming' ? (
                'Aceitar'
              ) : (
                'Conectar'
              )}
            </button>
          </div>

          <p className="text-slate-500 font-medium mt-8 leading-relaxed text-center max-w-sm text-sm">
            {profile.bio || 'Membro dedicado da comunidade EduConnect em busca de conhecimento.'}
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-md">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <GraduationCap size={14} />
              {profile.education_level || 'Estudante'}
            </div>
            {profile.interests?.map((interest, i) => (
              <span key={i} className="px-4 py-2 bg-white text-slate-600 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                {interest}
              </span>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-10">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[2rem] p-6 border border-slate-50 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`p-3 rounded-2xl ${stat.bg} mb-3`}>
                  <stat.icon className={stat.color} size={24} {...(stat.fill ? { fill: 'currentColor' } : {})} />
                </div>
                <span className="text-xl font-bold text-slate-800 tracking-tight">{stat.value}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Highlights Section */}
        <section className="mt-12 px-6 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Publicações</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                <BookOpen size={24} />
              </div>
              <p className="text-sm font-medium text-slate-400">Nenhuma publicação ainda.</p>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
