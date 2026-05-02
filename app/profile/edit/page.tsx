'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  MapPin, 
  GraduationCap, 
  Heart, 
  Target, 
  ChevronRight, 
  ChevronLeft, 
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Settings,
  Pencil
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const INTEREST_OPTIONS = [
  'Tecnologia', 'Negócios', 'Design', 'Marketing', 
  'Programação', 'Finanças', 'Educação', 'Ciência'
];

const EDUCATION_LEVELS = [
  'Ensino Secundário', 'Universitário', 'Pós-Graduação', 'Profissional'
];

const GOAL_OPTIONS = [
  { id: 'skills', label: 'Aprender novas competências', icon: '📚' },
  { id: 'opportunities', label: 'Encontrar oportunidades', icon: '💼' },
  { id: 'networking', label: 'Networking', icon: '🤝' },
  { id: 'teaching', label: 'Ensinar outros', icon: '👨‍🏫' },
];

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    country: 'Angola',
    city: '',
    education_level: '',
    interests: [] as string[],
    goal: '',
  });

  useEffect(() => {
    async function loadData() {
      if (authLoading) return;
      if (!user) {
        router.replace('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          username: data.username || '',
          bio: data.bio || '',
          country: data.country || 'Angola',
          city: data.city || '',
          education_level: data.education_level || '',
          interests: data.interests || [],
          goal: data.goal || '',
        });
      }
      setInitialLoading(false);
    }
    loadData();
  }, [user, authLoading, router]);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          country: formData.country,
          city: formData.city,
          education_level: formData.education_level,
          interests: formData.interests,
          goal: formData.goal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      router.push('/profile');
    } catch (err: any) {
      console.error('Error updating profile:', err.message);
      alert('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F9F9]">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-[#F9F9F9] min-h-screen pb-32">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-50 px-6 py-4 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-bold text-slate-800">Editar Perfil</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      <section className="pt-24 px-6 max-w-md mx-auto w-full space-y-10">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <User size={14} />
            </div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Informações Básicas</h2>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome Completo</label>
              <input 
                type="text" 
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full h-14 px-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Username</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">@</span>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                  className="w-full h-14 pl-10 pr-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Bio</label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
                className="w-full p-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <MapPin size={14} />
            </div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Localização</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">País</label>
              <select 
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                className="w-full h-14 px-5 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm"
              >
                <option value="Angola">Angola</option>
                <option value="Portugal">Portugal</option>
                <option value="Brasil">Brasil</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cidade</label>
              <input 
                type="text" 
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full h-14 px-5 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Academic */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <GraduationCap size={14} />
            </div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Académico</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {EDUCATION_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setFormData({...formData, education_level: level})}
                className={`h-14 px-5 rounded-2xl border flex items-center justify-between transition-all ${
                  formData.education_level === level 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-600' 
                  : 'border-white bg-white text-slate-500 shadow-sm'
                }`}
              >
                <span className="text-sm font-bold">{level}</span>
                {formData.education_level === level && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg">
              <Heart size={14} />
            </div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Interesses</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${
                  formData.interests.includes(interest)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-400 border-slate-50'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Target size={14} />
            </div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Objectivo Principal</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => setFormData({...formData, goal: goal.id})}
                className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                  formData.goal === goal.id
                  ? 'border-blue-600 bg-blue-50/50 text-blue-600'
                  : 'border-white bg-white text-slate-500 shadow-sm'
                }`}
              >
                <span className="text-2xl">{goal.icon}</span>
                <span className="text-sm font-bold text-left leading-tight">{goal.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Save Button */}
      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-50 p-6 z-50">
        <div className="max-w-md mx-auto">
          <button 
            disabled={loading}
            onClick={handleUpdate}
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              'Guardar Alterações'
            )}
          </button>
        </div>
      </footer>
    </main>
  );
}
