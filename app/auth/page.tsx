'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        if (authData.user) {
          // Verificar se o perfil existe
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authData.user.id)
            .single();

          if (profileError || !profile) {
            router.push('/onboarding');
          } else {
            router.push('/home');
          }
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        
        // Após o signup bem-sucedido, redirecionamos para o onboarding
        router.push('/onboarding');
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-[#F9F9F9] min-h-screen px-6 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-50" />

      <header className="fixed top-0 w-full h-16 bg-white/50 backdrop-blur-md flex items-center justify-center z-50">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-blue-600" size={28} />
          <span className="text-xl font-bold text-slate-800 tracking-tight">EduConnect</span>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-white border border-slate-100/50 p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-4"
          >
            {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {isLogin ? 'Bem-vindo de volta' : 'Comece a sua jornada'}
          </h1>
          <p className="text-sm text-slate-400 font-medium px-4">
            {isLogin ? 'Inicie sessão para continuar a aprender' : 'Junte-se à maior rede académica de Angola'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 text-red-600 text-xs font-bold leading-relaxed"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form className="space-y-6" onSubmit={handleAuth}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">E-mail Institucional</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@universidade.ao"
              className="w-full h-14 px-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none text-sm transition-all shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Palavra-passe</label>
              {isLogin && <button type="button" className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Esqueceu-se?</button>}
            </div>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-14 px-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none text-sm transition-all shadow-sm"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transform transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <span className="text-sm uppercase tracking-widest">{isLogin ? 'Entrar Agora' : 'Criar Conta'}</span>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
              </>
            )}
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-6 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Ou</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['google', 'facebook', 'apple'].map((brand) => (
            <button key={brand} className="flex items-center justify-center h-14 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-90 shadow-sm relative group overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{brand}</span>
            </button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-400 font-medium">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'} 
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 font-bold ml-2 hover:underline transition-all"
            >
              {isLogin ? 'Registe-se aqui' : 'Faça login aqui'}
            </button>
          </p>
        </div>
      </motion.div>

      <footer className="mt-12 py-8 flex flex-col items-center gap-4 text-center">
        <div className="flex gap-8">
          <button className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-blue-600 transition-colors">Termos</button>
          <button className="text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-blue-600 transition-colors">Privacidade</button>
        </div>
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.1em]">© 2024 EduConnect Angola • Inovação no Ensino Superior</p>
      </footer>
    </main>
  );
}
