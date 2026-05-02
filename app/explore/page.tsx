'use client';

import { motion } from 'motion/react';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { Trophy, Users, Search, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

const communities = [
  {
    id: 1,
    name: 'Cálculo I - Agostinho Neto',
    tag: 'MATEMÁTICA',
    members: '245 membros ativos',
    location: 'Luanda',
    image: 'https://picsum.photos/seed/comm1/400/200'
  },
  {
    id: 2,
    name: 'Desenvolvimento Web',
    tag: 'TECNOLOGIA',
    members: '189 membros ativos',
    location: 'Remoto',
    image: 'https://picsum.photos/seed/comm2/400/200'
  }
];

const ranking = [
  { id: 'ana-paula', rank: 1, name: 'Ana Paula', points: '2,450', university: 'UAN', course: 'Engenharia', avatar: 'https://picsum.photos/seed/user1/100/100' },
  { id: 'joao-manuel', rank: 2, name: 'João Manuel', points: '2,120', university: 'ISUTIC', course: 'Redes', avatar: 'https://picsum.photos/seed/user2/100/100' },
  { id: 'marta-silva', rank: 3, name: 'Marta Silva', points: '1,980', university: 'ISPTEC', course: 'Química', avatar: 'https://picsum.photos/seed/user3/100/100' }
];

export default function Explore() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  return (
    <main className="flex-1 lg:ml-20 pb-24 h-full overflow-y-auto bg-[#F9F9F9]">
      <TopBar />
      
      <div className="max-w-5xl mx-auto w-full">
        {/* Search Header */}
      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar comunidades, pessoas..." 
            className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-1 focus:ring-blue-600 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Communities Section */}
      <section className="mt-4">
        <div className="px-6 flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Explorar Comunidades</h2>
          <button className="text-blue-600 font-bold text-sm">Ver tudo</button>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 px-6">
          {communities.map((comm) => (
            <motion.div 
              key={comm.id}
              whileTap={{ scale: 0.98 }}
              className="flex-none w-[280px] bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm shadow-slate-100"
            >
              <div className="relative h-36">
                <Image src={comm.image} alt={comm.name} fill className="object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="p-5">
                <span className="px-2.5 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">{comm.tag}</span>
                <h3 className="font-bold text-slate-800 mt-2 line-clamp-1">{comm.name}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">{comm.members} • {comm.location}</p>
                <button className="w-full mt-4 bg-blue-50 text-blue-600 font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform">Aderir ao Grupo</button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Weekly Ranking */}
      <section className="mt-10 px-6">
        <div className="bg-white rounded-[32px] p-6 border border-slate-50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Ranking da Semana</h2>
            <Trophy className="text-amber-500" size={24} />
          </div>
          <div className="space-y-4">
            {ranking.map((user) => (
              <div 
                key={user.rank} 
                onClick={() => {
                  const targetPath = user.id === currentUser?.id ? '/profile' : `/profile/${user.id}`;
                  router.push(targetPath);
                }}
                className={`flex items-center justify-between p-3 rounded-2xl transition-colors cursor-pointer ${user.rank === 1 ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${user.rank === 1 ? 'border-blue-600' : 'border-slate-100'}`}>
                      <Image src={user.avatar} alt={user.name} width={48} height={48} className="object-cover" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${user.rank === 1 ? 'bg-blue-600' : 'bg-slate-400'}`}>
                      {user.rank}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{user.university} • {user.course}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${user.rank === 1 ? 'text-blue-600' : 'text-slate-800'}`}>{user.points}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pontos</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 border-2 border-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
            Ver Ranking Completo
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Topics */}
      <section className="mt-10 px-6 pb-20">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-4">Tópicos para você</h2>
        <div className="flex flex-wrap gap-2">
          {['#Matemática', '#Programação', '#Física', '#Economia', '#Direito', '#Medicina', '#Design'].map(tag => (
            <button key={tag} className="px-5 py-2.5 bg-white border border-slate-100 rounded-full text-sm font-bold text-slate-600 hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95 shadow-sm">
              {tag}
            </button>
          ))}
        </div>
      </section>
      </div>

      <BottomNav />
    </main>
  );
}
