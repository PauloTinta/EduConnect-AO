'use client';

import { useState } from 'react';
import { GraduationCap, Bell, CheckCircle2, MessageSquare, Heart, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  showNotification?: boolean;
}

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'like',
    content: 'Ana Luísa Mendes gostou do seu post sobre Python.',
    time: '2min',
    read: false,
    icon: <Heart size={14} className="text-red-500 fill-red-500" />
  },
  {
    id: 2,
    type: 'comment',
    content: 'Prof. António Costa comentou no seu projeto.',
    time: '14min',
    read: false,
    icon: <MessageSquare size={14} className="text-blue-500" />
  },
  {
    id: 3,
    type: 'follow',
    content: 'Mauro Baptista começou a seguir você.',
    time: '1h',
    read: true,
    icon: <UserPlus size={14} className="text-green-500" />
  },
  {
    id: 4,
    type: 'system',
    content: 'Parabéns! Você alcançou o Nível 5.',
    time: '3h',
    read: true,
    icon: <CheckCircle2 size={14} className="text-orange-500" />
  }
];

export function TopBar({ showNotification = true }: TopBarProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 w-full h-14 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/feed')}>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <GraduationCap size={22} />
        </div>
        <span className="text-xl font-extrabold text-slate-800 tracking-tight hidden sm:block">EduConnect</span>
      </div>

      <div className="flex items-center gap-3">
        {showNotification && (
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className={`relative p-2 rounded-xl transition-all active:scale-95 ${showDropdown ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full ring-2 ring-white animate-in zoom-in duration-300">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowDropdown(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden z-50 origin-top-right"
                  >
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllRead}
                          className="text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          Marcar tudo como lido
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto py-2">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            className={`px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 relative ${!notif.read ? 'bg-blue-50/20' : ''}`}
                          >
                            {!notif.read && (
                              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-full" />
                            )}
                            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                              {notif.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {notif.content}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium mt-1 inline-block">há {notif.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center">
                          <Bell size={32} className="text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">Nenhuma notificação por agora</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                      <button className="text-[11px] font-bold text-slate-500 hover:text-blue-600">
                        Ver todas as notificações
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
