'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { SplashScreen } from '@/components/splash-screen';
import AuthPage from '@/app/auth/page';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootEntry() {
  const [showSplash, setShowSplash] = useState(true);
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Redirecionamento unificado
  useEffect(() => {
    if (showSplash || loading) return;

    if (session) {
      const checkProfileAndRedirect = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle(); // Usar maybeSingle para evitar throw desnecessário

          if (!profile) {
            router.replace('/onboarding');
          } else {
            router.replace('/home');
          }
        } catch (err) {
          router.replace('/onboarding');
        }
      };
      
      checkProfileAndRedirect();
    }
  }, [showSplash, loading, session, router]);

  return (
    <div className="h-full">
      <AnimatePresence mode="wait">
        {(showSplash || loading) ? (
          <SplashScreen key="splash" />
        ) : !session ? (
          <AuthPage key="auth" />
        ) : (
          <div key="loader" className="flex h-screen items-center justify-center bg-white">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="absolute mt-20 text-xs font-bold text-slate-400 uppercase tracking-widest">A preparar a sua experiência...</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
