'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, LayoutGrid, Compass, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Feed', href: '/feed', icon: LayoutGrid },
  { name: 'Learn', href: '/home', icon: Home },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Profile', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 lg:left-0 lg:top-0 lg:h-full lg:w-20 lg:flex-col lg:border-r lg:border-t-0 w-full h-16 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 pb-safe z-50 lg:pb-0">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90 lg:w-full lg:py-6",
              isActive ? "text-blue-600 font-semibold" : "text-slate-400 hover:text-blue-500"
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] tracking-wide uppercase font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
