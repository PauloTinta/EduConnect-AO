'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar } from '@/components/top-bar';
import { BottomNav } from '@/components/bottom-nav';
import {
  Search, X, Heart, MessageCircle, Repeat2, Send,
  MoreHorizontal, Bookmark, Users, BookOpen, Flame,
  Trophy, TrendingUp, ChevronRight, Plus, PlayCircle,
  Image as ImageIcon, Video, Mic, BarChart3, Hash, Loader2
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  xp: number;
  level: number;
  streak: number;
}

interface SearchResult {
  id: string;
  type: 'user' | 'community' | 'post' | 'course';
  name: string;
  sub: string;
  avatar?: string | null;
}

export default function Feed() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const [newPost, setNewPost] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ type: 'image' | 'video' | 'audio', url: string } | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [activeCommentsPost, setActiveCommentsPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeComments, setActiveComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const { data: postsData, error: postsError } = await supabase
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
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Buscar reposts
      const { data: repostsData, error: repostsError } = await supabase
        .from('reposts')
        .select(`
          *,
          reposter:profiles(id, full_name, username),
          post:posts(
            *,
            author:profiles(full_name, username, avatar_url),
            poll:polls(
              id,
              question,
              options:poll_options(id, text, votes_count)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (repostsError) throw repostsError;

      // Se logado, buscar meus likes e salvos
      let myLikes: Set<string> = new Set();
      let mySaves: Set<string> = new Set();
      let myVotes: Record<string, string> = {}; // pollId -> optionId

      if (user) {
        const [likesRes, savesRes, votesRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', user.id),
          supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
          supabase.from('poll_votes').select('poll_id, option_id').eq('user_id', user.id)
        ]);

        likesRes.data?.forEach(l => myLikes.add(l.post_id));
        savesRes.data?.forEach(s => mySaves.add(s.post_id));
        votesRes.data?.forEach(v => myVotes[v.poll_id] = v.option_id);
      }

      // Buscar contagens reais de votos para garantir precisão
      const allPollIds = [
        ...(postsData || []).filter(p => p.poll?.[0]).map(p => p.poll[0].id),
        ...(repostsData || []).filter(r => r.post?.poll?.[0]).map(r => r.post.poll[0].id)
      ];

      let realVoteCounts: Record<string, number> = {}; // optionId -> count
      if (allPollIds.length > 0) {
        const { data: votesCountData } = await supabase
          .from('poll_votes')
          .select('option_id')
          .in('poll_id', allPollIds);
        
        if (votesCountData) {
          votesCountData.forEach((v: any) => {
            realVoteCounts[v.option_id] = (realVoteCounts[v.option_id] || 0) + 1;
          });
        }
      }
      
      const formatPostData = (p: any, repostContext?: any) => {
        const poll = p.poll?.[0];
        let totalVotes = 0;
        let formattedOptions = [];
        
        if (poll) {
          formattedOptions = poll.options.map((o: any) => {
            const count = realVoteCounts[o.id] || o.votes_count || 0;
            totalVotes += count;
            return {
              id: o.id,
              label: o.text,
              votes: count
            };
          });
        }

        return {
          id: p.id,
          feed_id: repostContext ? `repost-${repostContext.id}` : `post-${p.id}`,
          author_id: p.author_id,
          user: { 
            name: p.author?.full_name || 'Usuário', 
            avatar: p.author?.avatar_url, 
            role: 'Estudante' 
          },
          content: p.content,
          time: formatTime(repostContext ? repostContext.created_at : p.created_at),
          original_time: formatTime(p.created_at),
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          reposts: p.reposts_count || 0,
          image: p.media_type === 'image' ? p.media_url : null,
          video: p.media_type === 'video' ? p.media_url : null,
          audio: p.media_type === 'audio' ? p.media_url : null,
          poll: poll ? {
            id: poll.id,
            question: poll.question,
            options: formattedOptions,
            totalVotes,
            myVote: myVotes[poll.id]
          } : null,
          hashtags: p.hashtags || [],
          liked: myLikes.has(p.id),
          saved: mySaves.has(p.id),
          reposted_by: repostContext ? {
            id: repostContext.reposter?.id,
            name: repostContext.reposter?.full_name || repostContext.reposter?.username
          } : null,
          is_repost: !!repostContext
        };
      };

      const originalPostsFlat = (postsData || []).map(p => formatPostData(p));
      const repostsFlat = (repostsData || [])
        .filter(r => r.post) // Garantir que o post original ainda existe
        .map(r => formatPostData(r.post, r));

      const combined = [...originalPostsFlat, ...repostsFlat].sort((a, b) => {
        // Precisamos do timestamp real para ordenar corretamente
        // Aqui estamos usando a string formatada, o que é ruim para sort.
        // Vou ajustar formatPostData para retornar o timestamp bruto também.
        return 0; // Temporário, vou ajustar a lógica
      });

      // Re-ordenando usando timestamps brutos
      const combinedSorted = [...originalPostsFlat, ...repostsFlat].sort((a, b) => {
        const dateA = (postsData?.find(p => p.id === (a.is_repost ? a.id : a.id))?.created_at || '');
        // Na verdade, a melhor forma é injetar o timestamp bruto no processamento
        return 0;
      });

      // Ajustando formatPostData para incluir raw_date
      const finalPosts = [...(postsData || []).map(p => ({...formatPostData(p), raw_date: p.created_at})), 
                          ...(repostsData || []).filter(r => r.post).map(r => ({...formatPostData(r.post, r), raw_date: r.created_at}))]
                          .sort((a, b) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime());

      setPosts(finalPosts);
    } catch (err: any) {
      console.error('❌ ERRO AO BUSCAR POSTS:', err);
      console.error('❌ STRING ERROR:', JSON.stringify(err, null, 2));
    } finally {
      setLoadingPosts(false);
    }
  }, [user]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      // Load Profile Stats
      const { data: profData } = await supabase
        .from('profiles')
        .select('xp, level, streak, updated_at')
        .eq('id', user.id)
        .single();
      
      if (profData) {
        setProfile(profData);
        
        // Daily Streak Logic
        const lastLogin = new Date(profData.updated_at);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays >= 1) {
          const newStreak = diffDays === 1 ? profData.streak + 1 : 1;
          await supabase.from('profiles').update({ 
            streak: newStreak,
            updated_at: today.toISOString()
          }).eq('id', user.id);
          setProfile(prev => prev ? { ...prev, streak: newStreak } : prev);
        }
      }

      // Load Posts
      await fetchPosts();
    }
    loadData();
  }, [user, fetchPosts]);

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 0) {
        setSearching(true);
        try {
          // Search Users
          const { data: usersData } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
            .limit(5);

          // Search Posts (content)
          const { data: postsData } = await supabase
            .from('posts')
            .select('id, content')
            .ilike('content', `%${query}%`)
            .limit(5);

          const usersResults: SearchResult[] = (usersData || []).map(u => ({
            id: u.id,
            type: 'user',
            name: u.full_name || u.username,
            sub: `@${u.username}`,
            avatar: u.avatar_url
          }));

          const postsResults: SearchResult[] = (postsData || []).map(p => ({
            id: p.id,
            type: 'post',
            name: p.content.slice(0, 30) + '...',
            sub: 'Post encontrado'
          }));

          setSearchResults([...usersResults, ...postsResults]);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Tamanho máximo (ex: 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 50MB.');
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `media/${fileName}`;

      console.log('📤 Fazendo upload de:', filePath);

      const { data, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ ERRO UPLOAD:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(data.path);

      const type: 'image' | 'video' | 'audio' = file.type.startsWith('image/') ? 'image' : 
                   file.type.startsWith('video/') ? 'video' : 'audio';

      console.log('✅ URL PÚBLICA:', publicUrl);
      setAttachments({ type, url: publicUrl });
    } catch (err) {
      console.error('❌ ERRO NO PROCESSO DE UPLOAD:', err);
      alert('Erro ao carregar ficheiro. Verifique se o bucket "posts" existe e é público.');
    } finally {
      setUploading(false);
    }
  };

  const updateXP = async (gainedXP: number) => {
    if (!user || !profile) return;
    
    try {
      const newXP = profile.xp + gainedXP;
      let newLevel = profile.level;
      
      // Level up logic: each 100 XP is a level
      if (newXP >= 100) {
        newLevel += Math.floor(newXP / 100);
      }
      
      const xpValue = newXP % 100;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          xp: xpValue,
          level: newLevel
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, xp: xpValue, level: newLevel } : prev);
      
      if (newLevel > profile.level) {
        alert(`Parabéns! Subiste para o nível ${newLevel}! 🏆`);
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar XP:', err);
    }
  };

  function extractHashtags(text: string) {
    if (!text) return [];
    return (text.match(/#\w+/g) || []).map(tag => tag.toLowerCase().replace('#', ''));
  }

  const renderContent = (text: string) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#')) {
        const tag = word.replace('#', '');
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hashtag/${tag}`);
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

  const submitPost = async () => {
    // 🧪 VALIDAÇÃO
    if (!newPost.trim() && !attachments && !showPollEditor) {
      console.log('⚠️ Bloqueado: conteúdo vazio');
      return;
    }
    
    // Pegar usuário atual para garantir sessao fresca
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      alert('Você precisa estar logado para publicar.');
      return;
    }

    try {
      setUploading(true);
      
      const cleanHashtags = extractHashtags(newPost).map(h => h.replace('#', ''));

      const payload: Record<string, unknown> = {
        author_id: authData.user.id,
        content: newPost.trim() || null,
        media_url: attachments?.url || null,
        media_type: attachments?.type || null,
        hashtags: cleanHashtags,
        is_poll: showPollEditor
      };

      console.log('📦 PAYLOAD SENDING:', payload);

      const { data: post, error } = await supabase
        .from('posts')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // 🔍 DEBUG COMPLETO
        console.error('❌ ERRO NO INSERT:', error);
        console.error('❌ STRING ERROR:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ POST CRIADO:', post);
      
      // Ganhar XP por post
      await updateXP(10);

      if (showPollEditor && post) {
        const { data: poll, error: pollError } = await supabase.from('polls').insert({
          post_id: post.id,
          question: newPost.trim() || 'Qual a sua opinião?'
        }).select().single();

        if (pollError) {
          console.error('❌ ERRO NA POLL:', pollError);
          throw pollError;
        }

        const validOptions = pollOptions.filter(o => o.trim());
        if (validOptions.length > 0) {
          await supabase.from('poll_options').insert(
            validOptions.map(text => ({ poll_id: poll.id, text }))
          );
        }
      }

      // Reset states
      setNewPost('');
      setAttachments(null);
      setHashtags([]);
      setShowPollEditor(false);
      setPollOptions(['', '']);
      setShowComposer(false);
      
      // Refresh
      await fetchPosts();
    } catch (err: any) {
      console.error('❌ ERRO COMPLETO:', err);
      console.error('❌ STRING:', JSON.stringify(err, null, 2));
      alert(`Erro ao publicar post: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddHashtag = () => {
    const words = newPost.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('#') && lastWord.length > 1) {
      setHashtags(prev => [...new Set([...prev, lastWord])]);
    } else {
      setNewPost(prev => prev + ' #');
    }
  };

  const isSearching = searchFocused || query.length > 0;

  const toggleLike = async (postId: string) => {
    if (!user) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.liked;
    const newLiked = !isLiked;
    const newLikes = newLiked ? post.likes + 1 : Math.max(0, post.likes - 1);

    // Otimista
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, liked: newLiked, likes: newLikes } : p
    ));

    try {
      if (newLiked) {
        await supabase.from('post_likes').insert({ user_id: user.id, post_id: postId });
        await updateXP(1); // Ganhar XP por like
      } else {
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', postId);
      }
    } catch (err: any) {
      console.error('❌ ERRO NO LIKE:', err);
      console.error('❌ STRING ERROR:', JSON.stringify(err, null, 2));
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isSaved = post.saved;
    const newSaved = !isSaved;
    
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, saved: newSaved } : p
    ));

    try {
      if (newSaved) {
        await supabase.from('saved_posts').insert({ user_id: user.id, post_id: postId });
      } else {
        await supabase.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', postId);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) return;
    
    const post = posts.find(p => p.poll?.id === pollId);
    if (!post || !post.poll || post.poll.myVote) return;

    setPosts(prev => prev.map(p => {
      if (p.poll?.id === pollId) {
        const newOptions = p.poll.options.map((o: any) => 
          o.id === optionId ? { ...o, votes: o.votes + 1 } : o
        );
        return {
          ...p,
          poll: {
            ...p.poll,
            options: newOptions,
            totalVotes: p.poll.totalVotes + 1,
            myVote: optionId
          }
        };
      }
      return p;
    }));

    try {
      // Verificar se já votou (proteção extra no front)
      const { data: existingVote } = await supabase
        .from('poll_votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('poll_id', pollId)
        .maybeSingle();

      if (existingVote) return;

      await supabase.from('poll_votes').insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id
      });
      
      // Ganhar XP por votar
      await updateXP(3); // Adicionando uma regra extra de XP para votos
      
      // Recarregar para garantir sincronia real com o banco
      await fetchPosts();
    } catch (err: any) {
      console.error('❌ ERRO AO VOTAR:', err);
      console.error('❌ STRING ERROR:', JSON.stringify(err, null, 2));
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles(full_name, username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActiveComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !user || !activeCommentsPost) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: activeCommentsPost,
          user_id: user.id,
          content: commentText.trim()
        })
        .select('*, author:profiles(full_name, username, avatar_url)')
        .single();

      if (error) throw error;

      setActiveComments(prev => [...prev, data]);
      setCommentText('');
      
      // Ganhar XP por comentário
      await updateXP(5);
      
      // Atualizar contador localmente
      setPosts(prev => prev.map(p => 
        p.id === activeCommentsPost ? { ...p, comments: p.comments + 1 } : p
      ));
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const handleRepost = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Não permitir repost do próprio post (opcional, como solicitado)
    if (post.author_id === user.id && !post.is_repost) {
      alert('Não podes republicar o teu próprio conteúdo!');
      return;
    }

    try {
      // Verificar se já repostou
      const { data: existingRepost } = await supabase
        .from('reposts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (existingRepost) {
        alert('Já republicaste este conteúdo!');
        return;
      }

      // Inserir na tabela de reposts
      const { error: repostError } = await supabase.from('reposts').insert({
        user_id: user.id,
        post_id: postId
      });

      if (repostError) throw repostError;

      // Ganhar XP por repost
      await updateXP(7);

      // Otimista
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, reposts: (p.reposts || 0) + 1 } : p
      ));
      
      alert('Republicado com sucesso!');
      await fetchPosts();
    } catch (err: any) {
      console.error('❌ ERRO AO REPOSTAR:', err);
      alert(`Erro ao republicar: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handleConnect = async (targetUserId: string) => {
    if (!user) {
      alert('Faz login para te conectares!');
      return;
    }

    if (user.id === targetUserId) return;

    try {
      // Verificar se já existe conexão
      const { data: existing } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') alert('Pedido de conexão já enviado!');
        else if (existing.status === 'accepted') alert('Já estão conectados!');
        return;
      }

      // Criar conexão
      const { error: connError } = await supabase
        .from('connections')
        .insert({
          sender_id: user.id,
          receiver_id: targetUserId,
          status: 'pending'
        });

      if (connError) throw connError;

      // Criar Notificação
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        from_user: user.id,
        type: 'connection_request',
        message: 'enviou-te um pedido de conexão'
      });

      // XP por conectar
      await updateXP(5);

      alert('Pedido de conexão enviado!');
    } catch (err: any) {
      console.error('❌ ERRO AO CONECTAR:', err);
      alert('Erro ao enviar pedido de conexão. Verifica a tua rede.');
    }
  };

  const startVoiceRecording = () => {
    // MediaRecorder API implementation
    alert('Funcionalidade de gravação de voz em desenvolvimento...');
  };

  return (
    <main className="flex-1 lg:ml-20 pb-24 h-full overflow-y-auto bg-[#F9F9F9]">
      <TopBar />

      <div className="max-w-2xl mx-auto w-full px-4">

        {/* ── Search Bar ── */}
        <div className="sticky top-14 z-30 bg-[#F9F9F9]/80 backdrop-blur-sm pt-4 pb-3 -mx-4 px-4 border-b border-transparent transition-all" id="sticky-search-bar">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) {
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                }
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Pesquisar por aulas, pessoas ou temas..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-10 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none shadow-sm transition-all placeholder:text-slate-400"
            />
            {query.length > 0 && (
              <button 
                onClick={() => setQuery('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute left-4 right-4 bg-white border border-slate-100 rounded-3xl shadow-2xl mt-2 overflow-hidden z-40 max-w-2xl mx-auto"
              >
                {searching ? (
                  <div className="px-5 py-8 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
                    <p className="text-sm text-slate-400">A pesquisar...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Search size={28} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">
                      {query.trim() ? `Nenhum resultado para "${query}"` : 'Comece a digitar para pesquisar'}
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((item, i) => (
                      <motion.div
                        key={i}
                        whileTap={{ backgroundColor: '#F8FAFC' }}
                        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          if (item.type === 'user' && item.id) {
                            const targetPath = item.id === user?.id ? '/profile' : `/profile/${item.id}`;
                            router.push(targetPath);
                          } else if (item.type === 'post' && item.id) {
                            // Scroll to post if in same page or redirect
                            const element = document.getElementById(`post-${item.id}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            } else {
                              router.push(`/feed`); // Simple redirect for now
                            }
                          } else if (item.type === 'community') {
                            router.push('/explore');
                          }
                          setQuery('');
                          setSearchFocused(false);
                        }}
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {item.avatar
                            ? <Image src={item.avatar} alt={item.name} width={36} height={36} className="object-cover" />
                            : <Users size={16} className="text-blue-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{item.sub}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Stats Strip ── */}
        <div className="flex gap-3 mb-6 overflow-x-auto hide-scrollbar pb-1">
          <div className="flex-none bg-blue-600 text-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-sm shadow-blue-100">
            <Trophy size={18} className="opacity-80" />
            <div>
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-wider">Nível</p>
              <p className="text-sm font-bold leading-tight">{profile?.level || 1} · {(profile?.xp || 0).toLocaleString('pt-PT')} XP</p>
            </div>
          </div>
          <div className="flex-none bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-sm">
            <Flame size={18} className="text-orange-500 fill-orange-500" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ofensiva</p>
              <p className="text-sm font-bold text-slate-800 leading-tight">{profile?.streak || 0} dias</p>
            </div>
          </div>
          <div className="flex-none bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-sm">
            <TrendingUp size={18} className="text-green-500" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Liga</p>
              <p className="text-sm font-bold text-slate-800 leading-tight">Top 3 🏅</p>
            </div>
          </div>
          <div className="flex-none bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-sm">
            <PlayCircle size={18} className="text-blue-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Missão</p>
              <p className="text-sm font-bold text-slate-800 leading-tight">0/2 lições</p>
            </div>
          </div>
        </div>

        {/* ── Post Composer ── */}
        <AnimatePresence>
          {showComposer && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-100 rounded-3xl p-4 mb-4 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">{user?.email?.[0]?.toUpperCase() || 'E'}</span>
                </div>
                <div className="flex-1">
                  <textarea
                    autoFocus
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="O que está a aprender hoje?"
                    rows={newPost.split('\n').length || 3}
                    className="w-full text-sm text-slate-800 placeholder:text-slate-300 outline-none resize-none bg-transparent leading-relaxed"
                  />
                  
                  {/* Attachments Preview */}
                  {attachments && (
                    <div className="relative mt-3 rounded-2xl overflow-hidden border border-slate-50 group">
                      {attachments.type === 'image' && (
                        <div className="relative aspect-video">
                          <Image src={attachments.url} alt="upload" fill className="object-cover" />
                        </div>
                      )}
                      {attachments.type === 'video' && (
                        <video src={attachments.url} controls className="w-full rounded-2xl" />
                      )}
                      {attachments.type === 'audio' && (
                        <div className="p-4 bg-slate-50 flex items-center gap-3">
                          <Mic size={20} className="text-blue-600" />
                          <span className="text-xs font-bold text-slate-500">Áudio selecionado</span>
                        </div>
                      )}
                      <button 
                        onClick={() => setAttachments(null)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Poll Editor */}
                  {showPollEditor && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opções da Sondagem</span>
                        <button onClick={() => setShowPollEditor(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      </div>
                      <div className="space-y-2">
                        {pollOptions.map((opt, i) => (
                          <input
                            key={i}
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[i] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            placeholder={`Opção ${i + 1}`}
                            className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                          />
                        ))}
                        {pollOptions.length < 4 && (
                          <button 
                            type="button"
                            onClick={() => setPollOptions([...pollOptions, ''])}
                            className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            <Plus size={12} /> Adicionar opção
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hashtags Display */}
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {hashtags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <div className="flex gap-1">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Imagem/Vídeo">
                        <ImageIcon size={20} />
                      </button>
                      <button onClick={startVoiceRecording} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Gravar Áudio">
                        <Mic size={20} />
                      </button>
                      <button onClick={() => setShowPollEditor(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Sondagem">
                        <BarChart3 size={20} />
                      </button>
                      <button onClick={handleAddHashtag} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Hashtag">
                        <Hash size={20} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowComposer(false); setNewPost(''); setAttachments(null); }} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                        Cancelar
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={submitPost}
                        disabled={(!newPost.trim() && !attachments) || uploading}
                        className={`px-5 py-2 rounded-2xl text-xs font-bold transition-colors shadow-lg shadow-blue-100 ${newPost.trim() || attachments ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300 shadow-none'}`}
                      >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : 'Publicar'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── New Post Button ── */}
        {!showComposer && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowComposer(true)}
            className="w-full flex items-center gap-3 bg-white border border-slate-100 rounded-3xl px-5 py-3.5 mb-4 shadow-sm cursor-text"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">{user?.email?.[0]?.toUpperCase() || 'E'}</span>
            </div>
            <span className="text-sm text-slate-300 font-medium flex-1 text-left">O que está a aprender hoje?</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Plus size={16} className="text-white" />
            </div>
          </motion.button>
        )}

        {/* ── Feed ── */}
        <div className="space-y-3 pb-8">
          {loadingPosts ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando Feed...</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {posts.map((post, idx) => (
                <motion.article
                  id={post.id}
                  key={post.feed_id || post.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm"
                >
                  {/* Repost Header */}
                  {post.is_repost && post.reposted_by && (
                    <div className="px-4 pt-3 flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <Repeat2 size={12} />
                      <span 
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                        onClick={() => {
                          const targetPath = post.reposted_by.id === user?.id ? '/profile' : `/profile/${post.reposted_by.id}`;
                          router.push(targetPath);
                        }}
                      >
                        {post.reposted_by.name} republicou
                      </span>
                    </div>
                  )}

                  {/* Post Header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div 
                      className="relative flex-shrink-0 cursor-pointer" 
                      onClick={() => {
                        if (!post.author_id) return;
                        const targetPath = post.author_id === user?.id ? '/profile' : `/profile/${post.author_id}`;
                        router.push(targetPath);
                      }}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 relative">
                        {post.user.avatar
                          ? <Image src={post.user.avatar} alt={post.user.name} fill className="object-cover" />
                          : <div className="w-full h-full bg-blue-100 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
                        }
                      </div>
                    </div>
 
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="font-bold text-slate-800 text-sm truncate hover:text-blue-600 cursor-pointer transition-colors"
                          onClick={() => {
                            if (!post.author_id) return;
                            const targetPath = post.author_id === user?.id ? '/profile' : `/profile/${post.author_id}`;
                            router.push(targetPath);
                          }}
                        >
                          {post.user.name}
                        </span>
                        {user?.id !== post.author_id && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnect(post.author_id);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-full transition-colors active:scale-95"
                          >
                            Conectar
                          </button>
                        )}
                        {post.tag && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${post.tagColor}`}>{post.tag}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">{post.user.role} · {post.time}</p>
                    </div>
 
                    <button className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex gap-3 px-4">
                    <div className="flex flex-col items-center" style={{ width: 44 }}>
                      <div className="w-0.5 flex-1 bg-slate-100 rounded-full min-h-[8px]" />
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{renderContent(post.content)}</p>
                      
                      {/* Hashtags */}
                      {post.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {post.hashtags.map((tag: string) => (
                            <span 
                              key={tag} 
                              onClick={() => router.push(`/hashtag/${tag}`)}
                              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Poll Rendering */}
                      {post.poll && (
                        <div className="mt-4 space-y-2">
                          {post.poll.options.map((opt: any) => (
                            <div 
                              key={opt.id} 
                              onClick={() => handleVote(post.poll!.id, opt.id)}
                              className={`relative w-full h-11 border rounded-2xl flex items-center px-4 overflow-hidden group transition-all cursor-pointer ${post.poll!.myVote === opt.id ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 font-bold text-slate-700 hover:border-blue-200'}`}
                            >
                              <div 
                                className={`absolute left-0 top-0 h-full z-0 transition-all duration-1000 ${post.poll!.myVote === opt.id ? 'bg-blue-100/50' : 'bg-slate-100/50'}`} 
                                style={{ width: post.poll!.totalVotes > 0 ? `${(opt.votes / post.poll!.totalVotes) * 100}%` : '0%' }} 
                              />
                              <div className="relative z-10 w-full flex justify-between items-center text-xs">
                                <span className={post.poll!.myVote === opt.id ? 'text-blue-700' : ''}>{opt.label}</span>
                                {post.poll!.totalVotes > 0 && (
                                  <span className="opacity-60 font-mono">{Math.round((opt.votes / post.poll!.totalVotes) * 100)}%</span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between px-1">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{post.poll.totalVotes.toLocaleString()} votos</p>
                            {post.poll.myVote && <span className="text-[9px] font-bold text-blue-600 uppercase">Votado</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Media Attachments */}
                  <div className="px-4 pb-3">
                    {post.image && (
                      <div className="rounded-2xl overflow-hidden border border-slate-100 relative aspect-video">
                        <Image src={post.image} alt="post" fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {post.video && (
                      <video src={post.video} controls className="w-full rounded-2xl border border-slate-100" />
                    )}
                    {post.audio && (
                      <div className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-slate-100 shadow-sm">
                        <button className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform">
                          <PlayCircle size={20} fill="currentColor" />
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '40%' }}
                              className="h-full bg-blue-600" 
                            />
                          </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">0:42</span>
                    </div>
                  )}
                </div>

                  {/* Actions */}
                  <div className="flex items-center px-4 pb-4 gap-1">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-colors ${post.liked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Heart size={16} className={post.liked ? 'fill-red-500' : ''} />
                      <span>{post.likes}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => {
                        setActiveCommentsPost(post.id);
                        fetchComments(post.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>{post.comments}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleRepost(post.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                      <Repeat2 size={16} />
                      <span>{post.reposts}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                    >
                      <Send size={16} />
                    </motion.button>

                    <div className="flex-1" />

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleSave(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-colors ${post.saved ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <Bookmark size={16} className={post.saved ? 'fill-blue-600' : ''} />
                    </motion.button>
                  </div>
              </motion.article>
            ))}
          </AnimatePresence>
        )}
      </div>

      </div>
      <BottomNav />
      
      {/* ── Comment Drawer ── */}
      <AnimatePresence>
        {activeCommentsPost && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCommentsPost(null)}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] z-50 flex flex-col max-h-[85vh] lg:max-w-2xl lg:mx-auto"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto my-4" />
              
              <div className="px-6 pb-4 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 tracking-tight">Comentários</h3>
                <button 
                  onClick={() => setActiveCommentsPost(null)}
                  className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingComments ? (
                  <div className="py-12 flex flex-col items-center">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                  </div>
                ) : activeComments.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageCircle size={40} className="mx-auto text-slate-100 mb-3" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ainda não há comentários</p>
                    <p className="text-xs text-slate-300 mt-1">Seja o primeiro a partilhar o seu conhecimento!</p>
                  </div>
                ) : (
                  activeComments.map((comment, i) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-50 flex-shrink-0 relative">
                        <Image 
                          src={comment.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author?.username || i}`} 
                          alt="avatar" 
                          fill 
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="bg-slate-50 rounded-2xl p-4">
                          <p className="text-xs font-bold text-slate-800 mb-1">{comment.author?.full_name || 'Usuário'}</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{comment.content}</p>
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold mt-2 ml-2 uppercase tracking-tighter">
                          {formatTime(comment.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 bg-white border-t border-slate-50 pb-8">
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2 ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-blue-600 transition-all">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                    placeholder="Escreva um comentário..."
                    className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                  />
                  <button 
                    onClick={handlePostComment}
                    disabled={!commentText.trim()}
                    className={`p-2 rounded-xl transition-all ${commentText.trim() ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
