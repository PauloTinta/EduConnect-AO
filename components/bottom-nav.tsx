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
    <nav
      className={cn(
        // Mobile: fixed bottom bar
        'fixed bottom-0 left-0 w-full h-16 z-50',
        // With safe area for iPhone home indicator
        'bg-white/90 backdrop-blur-md border-t border-slate-100',
        'flex items-center justify-around px-1',
        // Add safe-area padding at the bottom
        'pb-[env(safe-area-inset-bottom,0px)]',
        // Desktop: vertical left sidebar
        'lg:top-0 lg:left-0 lg:h-full lg:w-20 lg:flex-col lg:border-r lg:border-t-0',
        'lg:justify-start lg:pt-4 lg:px-0 lg:pb-0',
        'lg:gap-0'
      )}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-90',
              'min-w-0 flex-1 py-2 rounded-xl mx-0.5',
              'lg:w-full lg:flex-none lg:py-5 lg:mx-0 lg:rounded-none lg:flex-row lg:gap-0 lg:flex-col',
              isActive
                ? 'text-blue-600 font-semibold'
                : 'text-slate-400 hover:text-blue-500'
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] tracking-wide uppercase font-medium truncate">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
