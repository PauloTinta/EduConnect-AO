'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, LayoutGrid, Compass, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

const navItems = [
  { name: 'Feed', href: '/feed', icon: LayoutGrid },
  { name: 'Learn', href: '/home', icon: Home },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Perfil', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 transition-all duration-200 active:scale-90 relative min-h-[56px]',
                isActive ? 'text-blue-600' : 'text-slate-400'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full"
                />
              )}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn(
                'text-[9px] tracking-wide uppercase transition-all',
                isActive ? 'font-black' : 'font-medium'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 z-50 bg-white border-r border-slate-100 flex-col items-center py-6 gap-1">
        {/* Logo */}
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
          <span className="text-white font-black text-sm">E</span>
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1.5 w-14 py-3 rounded-2xl transition-all duration-200 group',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="desktop-nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full -ml-0"
                />
              )}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn(
                'text-[8px] tracking-widest uppercase',
                isActive ? 'font-black' : 'font-medium'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
