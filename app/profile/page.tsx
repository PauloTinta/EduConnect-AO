'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { 
  BadgeCheck, 
  Flame, 
  Trophy, 
  CheckCircle2, 
  Rocket, 
  Zap, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Award, 
  ChevronRight, 
  Edit3,
  Settings,
  Share2,
  MapPin,
  GraduationCap,
  LogOut,
  Camera,
  MoreVertical,
  Heart,
  MessageCircle,
  Eye,
  Loader2
} from 'lucide-react';
import Image from 'next/image';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
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

export default function Profile() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) setProfile(data);
    }
    loadProfile();
  }, [user]);

  const stats = [
    { icon: Trophy, label: 'XP TOTAL', value: profile?.xp?.toLocaleString('pt-PT') || '0', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Flame, label: 'STREAK', value: `${profile?.streak || 0} Dias`, color: 'text-orange-500', bg: 'bg-orange-50', fill: true },
    { icon: BookOpen, label: 'NÍVEL', value: `Lvl ${profile?.level || 1}`, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Award, label: 'RANKING', value: '#1.284', color: 'text-amber-500', bg: 'bg-amber-50', fill: true }
  ];

  const getGoalIcon = (goalId?: string) => {
    switch (goalId) {
      case 'skills': return '📚';
      case 'opportunities': return '💼';
      case 'networking': return '🤝';
      case 'teaching': return '👨‍🏫';
      default: return '🎯';
    }
  };

  const getGoalLabel = (goalId?: string) => {
    switch (goalId) {
      case 'skills': return 'Aprender novas competências';
      case 'opportunities': return 'Encontrar oportunidades';
      case 'networking': return 'Networking';
      case 'teaching': return 'Ensinar outros';
      default: return 'Foco em progresso';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      // For demo purposes, we'll use a local preview if the bucket doesn't exist
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => prev ? { ...prev, avatar_url: reader.result as string } : null);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex-1 lg:ml-20 pb-24 h-full overflow-y-auto bg-[#F9F9F9]">
      <TopBar />
      
      <div className="max-w-5xl mx-auto w-full">
        {/* Top Actions */}
        <div className="flex justify-end gap-3 px-6 pt-6 relative">
          <button className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
            <Share2 size={20} className="text-slate-600" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2.5 rounded-2xl shadow-sm border transition-all ${
                isSettingsOpen ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings size={20} />
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSettingsOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-200/50 p-2 z-50 overflow-hidden"
                  >
                    <button 
                      onClick={() => router.push('/profile/edit')}
                      className="w-full flex items-center gap-3 p-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-colors group"
                    >
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Edit3 size={16} />
                      </div>
                      Editar Perfil
                    </button>
                    <div className="h-[1px] bg-slate-50 my-1 mx-2" />
                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 p-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors group"
                    >
                      <div className="p-2 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <LogOut size={16} />
                      </div>
                      Sair da Conta
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile Header */}
        <section className="px-6 pt-4 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl ring-8 ring-blue-50/50 relative group">
              <Image 
                src={profile?.avatar_url || "https://picsum.photos/seed/alex/200/200"} 
                alt={profile?.full_name || "User"} 
                fill 
                className={`object-cover transition-opacity duration-300 ${isUploading ? 'opacity-50' : 'opacity-100'}`} 
              />
              
              {/* Upload Overlay */}
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploading ? (
                  <Loader2 className="animate-spin text-white" size={24} />
                ) : (
                  <>
                    <Camera className="text-white mb-1" size={24} />
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Alterar</span>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleUploadAvatar}
                  disabled={isUploading}
                />
              </label>
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
              {profile?.full_name || user?.email?.split('@')[0] || 'Estudante'}
            </h1>
            <p className="text-blue-600 font-bold text-sm mt-2 tracking-wide uppercase opacity-70">
              @{profile?.username || user?.email?.split('@')[0]}
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-3 text-slate-400 font-medium">
            <MapPin size={14} className="text-slate-300" />
            <span className="text-sm">
              {[profile?.city, profile?.country].filter(Boolean).join(', ') || 'Planeta Terra'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xs mt-6">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1">Nível {profile?.level || 1}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-1">
                {profile?.xp ? `${profile.xp % 1000}/1000 XP` : '0/1000 XP'}
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-white shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(profile?.xp || 0) % 1000 / 10}%` }}
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
              />
            </div>
          </div>

          <p className="text-slate-500 font-medium mt-6 leading-relaxed text-center max-w-sm text-sm">
            {profile?.bio || 'Membro dedicado da comunidade EduConnect em busca de conhecimento.'}
          </p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-md">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <GraduationCap size={14} />
              {profile?.education_level || 'Estudante'}
            </div>
            {profile?.interests?.map((interest, i) => (
              <span key={i} className="px-4 py-2 bg-white text-slate-600 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                {interest}
              </span>
            ))}
          </div>

          {/* Goal Highlight */}
          {profile?.goal && (
            <div className="mt-6 flex items-center gap-3 px-5 py-3 bg-blue-600 text-white rounded-[1.5rem] shadow-lg shadow-blue-200">
              <span className="text-xl">{getGoalIcon(profile.goal)}</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Objectivo Principal</span>
                <span className="text-xs font-bold">{getGoalLabel(profile.goal)}</span>
              </div>
            </div>
          )}

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

        {/* Achievements */}
        <section className="mt-12 px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Conquistas</h2>
            <button className="text-blue-600 font-bold text-sm hover:underline">Ver todas</button>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-6 pb-2">
            {[
              { icon: Rocket, label: 'Pioneer', bg: 'bg-blue-600', iconColor: 'text-white' },
              { icon: Zap, label: 'Lightning', bg: 'bg-orange-500', iconColor: 'text-white' },
              { icon: Users, label: 'Mentor', bg: 'bg-slate-800', iconColor: 'text-white' },
              { icon: BookOpen, label: 'Scholar', bg: 'bg-green-600', iconColor: 'text-white' }
            ].map((badge, i) => (
              <div key={i} className="flex-none flex flex-col items-center gap-3">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 cursor-pointer ${badge.bg}`}>
                  <badge.icon className={badge.iconColor} size={32} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{badge.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 🔥 Destaques (Highlights) Section */}
        <section className="mt-12 px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Destaques</h2>
            <button className="text-slate-400 font-bold text-sm hover:text-blue-600 transition-colors">Mais Populares</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 1,
                image: "https://picsum.photos/seed/edu1/800/600",
                title: "Como os engenheiros de Angola estão a revolucionar o mercado de software local",
                stats: { likes: 342, comments: 24, views: "1.2k" },
                category: "Artigo"
              },
              {
                id: 2,
                image: "https://picsum.photos/seed/edu2/800/600",
                title: "Lógica de Programação: Os fundamentos que ninguém te conta",
                stats: { likes: 189, comments: 12, views: "850" },
                category: "Guia"
              }
            ].map((highlight) => (
              <motion.div 
                key={highlight.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="h-48 relative overflow-hidden">
                  <Image src={highlight.image} alt={highlight.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{highlight.category}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-800 tracking-tight leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                    {highlight.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Heart size={14} className="group-hover:text-red-500 transition-colors" />
                        <span className="text-[11px] font-bold">{highlight.stats.likes}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <MessageCircle size={14} className="group-hover:text-blue-500 transition-colors" />
                        <span className="text-[11px] font-bold">{highlight.stats.comments}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 opacity-60">
                      <Eye size={14} />
                      <span className="text-[10px] font-bold uppercase">{highlight.stats.views}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mt-12 px-6 pb-12">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Atividade Recente</h2>
          <div className="space-y-3">
            {[
              { icon: BookOpen, title: 'Concluiu Módulo: React Hooks', time: 'Há 2 horas', exp: '+250 XP', bg: 'bg-blue-600' },
              { icon: MessageSquare, title: 'Comentou no Fórum de IA', time: 'Ontem', exp: '+50 XP', bg: 'bg-orange-500' },
              { icon: Award, title: 'Nova Certificação: UI Design', time: 'Há 3 dias', exp: '+1000 XP', bg: 'bg-slate-800' }
            ].map((act, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-50 rounded-[1.5rem] shadow-sm group cursor-pointer hover:bg-slate-50 transition-colors">
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl text-white ${act.bg} shadow-lg shadow-current/10`}>
                  <act.icon size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-snug">{act.title}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{act.time} • <span className="text-blue-600 font-bold">{act.exp}</span></p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
