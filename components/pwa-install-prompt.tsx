'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Listen for install prompt (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS instructions after 5 seconds if not installed
    if (ios) {
      const dismissed = localStorage.getItem('pwa-ios-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa-ios-dismissed', 'true');
    }
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-[200] lg:left-auto lg:right-6 lg:w-80"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100 border border-blue-50 p-5 flex gap-4 items-start">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
            <Smartphone size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-sm leading-tight">Instalar EduConnect</h3>
            {isIOS ? (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Toca em <strong>Partilhar</strong> e depois <strong>"Adicionar ao Ecrã Inicial"</strong> para instalar.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Instala a app no teu dispositivo para acesso rápido, mesmo offline.
              </p>
            )}
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-200 active:scale-95 transition-transform"
              >
                <Download size={14} />
                Instalar agora
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
