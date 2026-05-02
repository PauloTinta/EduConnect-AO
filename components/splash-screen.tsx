'use client';

import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';

export function SplashScreen() {
  return (
    <motion.main 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
    >
      <div className="flex flex-col items-center gap-12">
        {/* Logo Unit */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative flex items-center justify-center w-28 h-28 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100"
        >
          <GraduationCap className="text-white" size={64} fill="currentColor" />
        </motion.div>

        {/* Brand Text */}
        <div className="flex flex-col items-center gap-2">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-blue-600 tracking-tight"
          >
            EduConnect
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5 }}
            className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]"
          >
            Angola
          </motion.p>
        </div>
      </div>

      {/* Progress */}
      <div className="absolute bottom-16 w-full max-w-[200px] flex flex-col items-center gap-4">
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="h-full bg-blue-600 rounded-full"
          />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          A carregar o seu futuro...
        </span>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[9px] font-bold text-slate-300 tracking-[0.3em] uppercase">
          Ensino & Inovação
        </p>
      </div>

      {/* Decoration Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#0070F3 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
    </motion.main>
  );
}
