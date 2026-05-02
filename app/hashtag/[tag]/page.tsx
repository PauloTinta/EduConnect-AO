'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useParams } from 'next/navigation';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import Image from 'next/image';
import { 
  ArrowLeft, Heart, MessageCircle, Repeat2, Bookmark, 
  Users, MoreHorizontal, Loader2, PlayCircle, Hash
} from 'lucide-react';

export default function HashtagPage() {
  const { tag } = useParams() as { tag: string };
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(full_name, username, avatar_url),
          poll:polls(
            id,
            question,
            options:poll_options(id, text, votes_count)
          )
        `)
        .contains('hashtags', [tag.toLowerCase()])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Formatting logic similar to feed
      let myLikes: Set<string> = new Set();
      let mySaves: Set<string> = new Set();

      if (user) {
        const [likesRes, savesRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id),
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
        ]);

        likesRes.data?.forEach(l => myLikes.add(l.post_id));
        savesRes.data?.forEach(s => mySaves.add(s.post_id));
      }

      const formattedPosts = (data || []).map(p => ({
        id: p.id,
        author_id: p.author_id,
        user: { 
          name: p.author?.full_name || 'Usuário', 
          avatar: p.author?.avatar_url, 
          role: 'Estudante' 
        },
        content: p.content,
        time: new Date(p.created_at).toLocaleDateString(),
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        reposts: p.reposts_count || 0,
        image: p.media_type === 'image' ? p.media_url : null,
        video: p.media_type === 'video' ? p.media_url : null,
        audio: p.media_type === 'audio' ? p.media_url : null,
        hashtags: p.hashtags || [],
        liked: myLikes.has(p.id),
        saved: mySaves.has(p.id),
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error('Error fetching hashtag posts:', err);
    } finally {
      setLoading(false);
    }
  }, [tag, user]);

  useEffect(() => {
    fetchPosts(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchPosts]);

  const renderContent = (text: string) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#')) {
        const t = word.replace('#', '');
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hashtag/${t}`);
            }}
            className="text-blue-600 font-bold cursor-pointer hover:underline"
          >
            {word}
          </span>
        );
      }
      return word;
    });
  };

  return (
    <main className="flex-1 lg:ml-20 pb-24 min-h-screen bg-[#F9F9F9]">
      <TopBar />
      
      <div className="max-w-2xl mx-auto w-full px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-white rounded-2xl border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                <Hash size={20} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">#{tag}</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">{posts.length} publicações encontradas</p>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">A carregar conteúdo...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
              <Hash size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">Nenhum post com esta hashtag ainda.</p>
              <button 
                onClick={() => router.push('/feed')}
                className="mt-4 text-sm font-bold text-blue-600 hover:underline"
              >
                Voltar ao Feed
              </button>
            </div>
          ) : (
            posts.map((post, idx) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-50 border border-slate-100 relative">
                      {post.user.avatar ? (
                        <Image src={post.user.avatar} alt={post.user.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">{post.user.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{post.time}</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{renderContent(post.content)}</p>

                  {post.image && (
                    <div className="rounded-3xl overflow-hidden mb-4 relative aspect-video border border-slate-50">
                      <Image src={post.image} alt="content" fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-slate-400">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-xs font-bold">
                      <Heart size={14} className={post.liked ? 'fill-red-500 text-red-500' : ''} />
                      <span className={post.liked ? 'text-red-500' : ''}>{post.likes}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full text-xs font-bold">
                      <MessageCircle size={14} />
                      <span>{post.comments}</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
