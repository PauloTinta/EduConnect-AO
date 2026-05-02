'use client';

import { motion } from 'motion/react';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { Flame, Trophy, PlayCircle, HelpCircle, MessageSquare, Timer, Library } from 'lucide-react';
import Image from 'next/image';

const courses = [
  {
    id: 1,
    title: 'Introdução à Programação',
    category: 'Computação',
    progress: 45,
    modules: '3 de 8',
    image: 'https://picsum.photos/seed/edu1/600/400'
  },
  {
    id: 2,
    title: 'Gestão de Projectos Ágeis',
    category: 'Negócios',
    progress: 15,
    modules: '1 de 12',
    image: 'https://picsum.photos/seed/edu2/600/400'
  },
  {
    id: 3,
    title: 'Análise de Dados com Python',
    category: 'Data Science',
    progress: 80,
    modules: '6 de 7',
    image: 'https://picsum.photos/seed/edu3/600/400'
  }
];

export default function Dashboard() {
  return (
    <main className="flex-1 lg:ml-20 pb-safe-nav h-full overflow-y-auto bg-[#F9F9F9]">
      <TopBar />
      
      <div className="max-w-5xl mx-auto w-full">
        {/* Stats Section */}
      <section className="px-6 pt-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="col-span-2 bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Nível Atual</span>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">Lvl 12</span>
            </div>
            <h2 className="text-4xl font-bold mb-2">2,450 XP</h2>
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '70%' }}
                className="bg-white h-full"
              />
            </div>
            <p className="text-[11px] mt-3 opacity-90 font-medium tracking-wide">Faltam 550 XP para o Nível 13</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <Flame className="text-orange-500 mb-2 fill-orange-500" size={32} />
            <span className="text-2xl font-bold text-slate-800">15</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dias de Ofensiva</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <Trophy className="text-blue-600 mb-2" size={32} />
            <span className="text-2xl font-bold text-slate-800">Top 3</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Liga Diamante</span>
          </div>
        </motion.div>
      </section>

      {/* Daily Missions */}
      <section className="mt-10 px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Missões Diárias</h3>
          <button className="text-blue-600 text-sm font-semibold hover:underline">Ver todas</button>
        </div>
        <div className="space-y-3">
          {[
            { icon: PlayCircle, title: 'Ver 2 lições', sub: 'Assista conteúdos hoje', color: 'text-blue-600', iconBg: 'bg-blue-50', progress: 0, total: 2 },
            { icon: HelpCircle, title: 'Questionário', sub: 'Ganhe +50 XP', color: 'text-orange-500', iconBg: 'bg-orange-50', done: false },
            { icon: MessageSquare, title: 'Comentar no fórum', sub: 'Partilhe conhecimento', color: 'text-slate-500', iconBg: 'bg-slate-50', done: false }
          ].map((mission, i) => (
            <motion.div 
              key={i}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 bg-white border border-slate-50 rounded-2xl shadow-sm cursor-pointer"
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${mission.iconBg} ${mission.color}`}>
                <mission.icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{mission.title}</p>
                {mission.total !== undefined ? (
                  <div className="w-full bg-slate-50 h-1.5 rounded-full mt-2">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(mission.progress! / mission.total) * 100}%` }} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">{mission.sub}</p>
                )}
              </div>
              {mission.total !== undefined ? (
                <span className="text-sm font-bold text-slate-400">{mission.progress}/{mission.total}</span>
              ) : (
                <div className="w-6 h-6 border-2 border-slate-100 rounded-full" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Continue Learning */}
      <section className="mt-10">
        <h3 className="px-6 text-xl font-bold text-slate-800 mb-4 tracking-tight">Continuar Aprendendo</h3>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 px-6 pb-4">
          {courses.map((course) => (
            <motion.div 
              key={course.id}
              whileTap={{ scale: 0.95 }}
              className="flex-none w-64 group cursor-pointer"
            >
              <div className="relative aspect-video rounded-3xl overflow-hidden mb-3 shadow-md">
                <Image 
                  src={course.image} 
                  alt={course.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${course.progress}%` }}
                    className="bg-blue-500 h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  />
                </div>
              </div>
              <h4 className="font-bold text-slate-800 text-sm truncate">{course.title}</h4>
              <p className="text-xs text-slate-400 font-medium">Módulo {course.modules} • {course.progress}% concluído</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Challenges */}
      <section className="mt-6 px-6 pb-8">
        <h3 className="text-xl font-bold text-slate-800 mb-4 tracking-tight">Desafios Rápidos</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 p-5 rounded-3xl relative overflow-hidden active:scale-95 transition-transform group cursor-pointer">
            <Timer className="text-blue-600 mb-3" size={28} />
            <h4 className="font-bold text-slate-800 text-sm mb-1">Blitz Quiz</h4>
            <p className="text-[10px] text-slate-400 font-medium mb-3">60 segundos para responder</p>
            <span className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">+30 XP</span>
          </div>
          <div className="bg-white border border-slate-100 p-5 rounded-3xl relative overflow-hidden active:scale-95 transition-transform group cursor-pointer">
            <Library className="text-orange-500 mb-3" size={28} />
            <h4 className="font-bold text-slate-800 text-sm mb-1">Flashcards</h4>
            <p className="text-[10px] text-slate-400 font-medium mb-3">Revisão rápida de hoje</p>
            <span className="inline-block bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">+15 XP</span>
          </div>
        </div>
      </section>
      </div>

      <BottomNav />
    </main>
  );
}
