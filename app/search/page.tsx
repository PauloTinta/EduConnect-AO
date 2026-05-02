'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import Image from 'next/image';
import { 
  Search as SearchIcon, ArrowLeft, Users, Loader2, 
  ChevronRight, BookOpen, Layers, MessageSquare 
} from 'lucide-react';
import { Suspense } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{
    users: any[];
    posts: any[];
    communities: any[];
    courses: any[];
  }>({
    users: [],
    posts: [],
    communities: [],
    courses: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'communities' | 'courses'>('all');

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    
    setLoading(true);
    try {
      // 1. Search Users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(10);

      // 2. Search Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, author:profiles(full_name, username, avatar_url)')
        .ilike('content', `%${q}%`)
        .limit(10);

      // 3. Search Communities (assuming a table exists or just mock for now)
      // Since it's a social app, there might be a communities or groups table.
      // If not, we'll return empty.
      let communitiesData: any[] = [];
      try {
        const { data } = await supabase
          .from('communities')
          .select('*')
          .ilike('name', `%${q}%`)
          .limit(5);
        communitiesData = data || [];
      } catch (e) {
        console.warn('Communities table may not exist yet');
      }

      // 4. Search Courses (similar to communities)
      let coursesData: any[] = [];
      try {
        const { data } = await supabase
          .from('courses')
          .select('*')
          .ilike('title', `%${q}%`)
          .limit(5);
        coursesData = data || [];
      } catch (e) {
        console.warn('Courses table may not exist yet');
      }

      setResults({
        users: usersData || [],
        posts: postsData || [],
        communities: communitiesData,
        courses: coursesData
      });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [initialQuery, performSearch]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      performSearch(query);
    }
  };

  const tabs: { id: 'all' | 'users' | 'posts' | 'communities' | 'courses'; label: string }[] = [
    { id: 'all', label: 'Tudo' },
    { id: 'users', label: 'Pessoas' },
    { id: 'posts', label: 'Posts' },
    { id: 'communities', label: 'Comunidades' },
    { id: 'courses', label: 'Cursos' }
  ];

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pt-6">
      {/* Search Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-white rounded-2xl border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            placeholder="O que procuras?"
            className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-600 outline-none shadow-sm shadow-slate-100 transition-all font-medium"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-8 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-none px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Container */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-20 flex flex-col items-center">
            <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">A explorar a rede...</p>
          </div>
        ) : (
          <>
            {/* Users Section */}
            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Pessoas
                  </h2>
                </div>
                <div className="space-y-2">
                  {results.users.map((profile) => (
                    <motion.div
                      key={profile.id}
                      whileTap={{ scale: 0.99, backgroundColor: '#F8FAFC' }}
                      onClick={() => router.push(profile.id === user?.id ? '/profile' : `/profile/${profile.id}`)}
                      className="flex items-center gap-3 p-4 bg-white border border-slate-50 rounded-3xl hover:border-blue-100 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 relative shadow-inner">
                        {profile.avatar_url ? (
                          <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-lg">
                            {profile.full_name?.[0] || profile.username?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{profile.full_name || profile.username}</p>
                        <p className="text-[11px] text-slate-400 font-medium">@{profile.username}</p>
                      </div>
                      <button className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95">
                        Seguir
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Posts Section */}
            {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={14} /> Publicações
                  </h2>
                </div>
                <div className="space-y-3">
                  {results.posts.map((post) => (
                    <div 
                      key={post.id}
                      onClick={() => router.push(`/feed`)} // Should link to post detail if exists
                      className="p-5 bg-white border border-slate-50 rounded-3xl cursor-pointer hover:border-blue-100 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-50 border border-slate-100 relative">
                          {post.author?.avatar_url ? (
                            <Image src={post.author.avatar_url} alt="avatar" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-600 text-[10px] font-bold">U</div>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-slate-500">{post.author?.full_name || 'Alguém'}</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{post.content}</p>
                      <div className="mt-3 flex items-center gap-4 text-slate-300">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <Layers size={12} /> {post.hashtags?.length || 0} tags
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State if no hits */}
            {results.users.length === 0 && results.posts.length === 0 && !loading && (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SearchIcon size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold mb-1">Nenhum resultado encontrado</p>
                <p className="text-sm text-slate-300">Tenta pesquisar por outras palavras-chave.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="flex-1 lg:ml-20 pb-24 min-h-screen bg-[#F9F9F9]">
      <TopBar />
      <Suspense fallback={
        <div className="max-w-2xl mx-auto w-full px-4 pt-20 flex flex-col items-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">A carregar...</p>
        </div>
      }>
        <SearchContent />
      </Suspense>
      <BottomNav />
    </main>
  );
}
