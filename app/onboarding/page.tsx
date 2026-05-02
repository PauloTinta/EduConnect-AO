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
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const STEPS = [
  { id: 'basic', title: 'Informações Básicas', icon: User },
  { id: 'location', title: 'Localização', icon: MapPin },
  { id: 'academic', title: 'Nível Académico', icon: GraduationCap },
  { id: 'interests', title: 'Interesses', icon: Heart },
  { id: 'goal', title: 'Objectivo', icon: Target },
];

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

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '', // New field
    country: 'Angola',
    city: '',
    education_level: '',
    interests: [] as string[],
    goal: '',
  });

  // Security check: Redirect if not logged in
  useEffect(() => {
  const checkUser = async () => {
    if (authLoading) return;

    if (!user) {
      router.replace('/auth');
    }
  };

  checkUser();
}, [user, authLoading, router]);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return formData.full_name.length > 2 && formData.username.length > 3;
      case 1: return formData.country.length > 0;
      case 2: return formData.education_level.length > 0;
      case 3: return formData.interests.length > 0;
      case 4: return formData.goal.length > 0;
      default: return false;
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleComplete = async () => {
  if (!user) return;

  setLoading(true);

  try {
    // 🔥 VERIFICA SE PERFIL EXISTE (SEGURO)
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao verificar perfil:', fetchError.message);
    }

    // 🔥 UPSERT SEGURO (SEM CONFLITO COM TRIGGER)
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio, // New field saved
          country: formData.country,
          city: formData.city,
          education_level: formData.education_level,
          interests: formData.interests,
          goal: formData.goal,
          avatar_url: `https://picsum.photos/seed/${formData.username}/200/200`,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id', // 🔥 evita duplicação
        }
      );

    if (error) {
      console.error('Erro ao salvar perfil:', error.message);
      throw error;
    }

    // 🔥 SUCESSO
    router.push('/home');

  } catch (err: any) {
    console.error('Onboarding error:', err.message || err);
    alert('Erro ao guardar perfil. Ver consola.');
  } finally {
    setLoading(false);
  }
};


  if (authLoading) return null;

  const StepIcon = STEPS[currentStep].icon;

  return (
    <main className="flex-1 flex flex-col bg-[#F9F9F9] min-h-screen">
      {/* Progress Header */}
      <header className="fixed top-0 w-full bg-white border-b border-slate-50 px-6 py-4 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <StepIcon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{STEPS[currentStep].title}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Passo {currentStep + 1} de {STEPS.length}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentStep ? 'w-4 bg-blue-600' : 'w-1.5 bg-slate-100'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Form Content */}
      <section className="flex-1 pt-24 pb-32 px-6 flex flex-col items-center">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder="Ex: João Manuel"
                      className="w-full h-14 px-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome de Utilizador</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                      <input 
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                        placeholder="username"
                        className="w-full h-14 pl-10 pr-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Bio (Diz-nos algo sobre ti)</label>
                    <textarea 
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Ex: Entusiasta de tecnologia e futuro Eng. de Software em Angola..."
                      rows={3}
                      className="w-full p-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">País</label>
                    <select 
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full h-14 px-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm transition-all appearance-none"
                    >
                      <option value="Angola">Angola</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cidade</label>
                    <input 
                      type="text" 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Ex: Luanda"
                      className="w-full h-14 px-5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none text-sm shadow-sm transition-all"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-1 gap-3">
                  {EDUCATION_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setFormData({...formData, education_level: level})}
                      className={`h-16 px-6 rounded-2xl border flex items-center justify-between transition-all ${
                        formData.education_level === level 
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' 
                        : 'border-white bg-white shadow-sm'
                      }`}
                    >
                      <span className="font-bold text-sm text-slate-700">{level}</span>
                      {formData.education_level === level && <CheckCircle2 size={20} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 3 && (
                <div className="grid grid-cols-2 gap-3">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${
                        formData.interests.includes(interest)
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                        : 'border-white bg-white text-slate-600 shadow-sm'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">{interest}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 4 && (
                <div className="grid grid-cols-1 gap-3">
                  {GOAL_OPTIONS.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => setFormData({...formData, goal: goal.id})}
                      className={`p-6 rounded-3xl border flex items-center gap-4 transition-all ${
                        formData.goal === goal.id
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                        : 'border-white bg-white shadow-sm'
                      }`}
                    >
                      <span className="text-3xl">{goal.icon}</span>
                      <span className="font-bold text-sm text-slate-700 text-left leading-snug">{goal.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-50 p-6 z-50">
        <div className="max-w-md mx-auto flex gap-4">
          {currentStep > 0 && (
            <button 
              onClick={prevStep}
              className="h-14 px-6 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <button 
            disabled={!isStepValid() || loading}
            onClick={currentStep === STEPS.length - 1 ? handleComplete : nextStep}
            className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                {currentStep === STEPS.length - 1 ? 'Concluir' : 'Próximo'}
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </footer>
    </main>
  );
}
