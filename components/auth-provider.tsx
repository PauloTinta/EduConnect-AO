'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type PresenceUser = {
  user_id: string;
  online_at: string;
};

type OnlineUsersMap = Record<string, PresenceUser>;

type TypingUsersMap = Record<
  string,
  Record<string, boolean>
>;

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;

  onlineUsers: OnlineUsersMap;
  typingUsers: TypingUsersMap;

  isOnline: (userId: string) => boolean;

  startTyping: (
    conversationId: string
  ) => Promise<void>;

  stopTyping: (
    conversationId: string
  ) => Promise<void>;

  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,

  onlineUsers: {},
  typingUsers: {},

  isOnline: () => false,

  startTyping: async () => {},
  stopTyping: async () => {},

  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] =
  useState<OnlineUsersMap>({});

const [typingUsers, setTypingUsers] =
  useState<TypingUsersMap>({});

const presenceChannelRef =
  useRef<RealtimeChannel | null>(null);

const heartbeatRef =
  useRef<NodeJS.Timeout | null>(null);

const typingTimeoutRef =
  useRef<NodeJS.Timeout | null>(null);
const updateUserStatus = useCallback(
  async (
    isOnline: boolean,
    lastSeen?: string,
  ) => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        is_online: isOnline,
        last_seen:
          lastSeen ??
          new Date().toISOString(),
      })
      .eq('id', user.id);
  },
  [user],
);
const isOnline = useCallback(
  (userId: string) => {
    return !!onlineUsers[userId];
  },
  [onlineUsers],
);
const stopTyping = useCallback(
  async (conversationId: string) => {
    if (!user) return;

    const channel =
      presenceChannelRef.current;

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: conversationId,
        user_id: user.id,
        typing: false,
      },
    });
  },
  [user],
);
const startTyping = useCallback(
  async (conversationId: string) => {
    if (!user) return;

    const channel =
      presenceChannelRef.current;

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: conversationId,
        user_id: user.id,
        typing: true,
      },
    });

    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current,
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        stopTyping(conversationId);
      }, 1500);
  },
  [user],
);

  
  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(safetyTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(safetyTimeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
  if (!user) return;

  if (presenceChannelRef.current) {
    return;
  }

  const channel = supabase.channel(
    'global-presence',
    {
      config: {
        presence: {
          key: user.id,
        },
      },
    },
  );

  presenceChannelRef.current =
    channel;

  channel.on(
    'presence',
    { event: 'sync' },
    () => {
      const state =
        channel.presenceState<PresenceUser>();

      const formatted: OnlineUsersMap =
        {};

      Object.entries(state).forEach(
        ([key, value]) => {
          const presence =
            value?.[0];

          if (!presence) return;

          formatted[key] = {
            user_id:
              presence.user_id,
            online_at:
              presence.online_at,
          };
        },
      );

      setOnlineUsers(formatted);
    },
  );

  channel.on(
    'broadcast',
    { event: 'typing' },
    ({ payload }) => {
      const {
        conversation_id,
        user_id,
        typing,
      } = payload;

      setTypingUsers(prev => {
        const updated = {
          ...prev,
        };

        if (!updated[conversation_id]) {
          updated[conversation_id] =
            {};
        }

        if (typing) {
          updated[conversation_id][
            user_id
          ] = true;
        } else {
          delete updated[
            conversation_id
          ][user_id];
        }

        return updated;
      });
    },
  );

  channel.subscribe(async status => {
    if (status !== 'SUBSCRIBED')
      return;

    await updateUserStatus(true);

    await channel.track({
      user_id: user.id,
      online_at:
        new Date().toISOString(),
    });

    heartbeatRef.current =
      setInterval(async () => {
        await channel.track({
          user_id: user.id,
          online_at:
            new Date().toISOString(),
        });
      }, 25000);
  });

  const handleVisibility =
    async () => {
      if (
        document.visibilityState ===
        'hidden'
      ) {
        await updateUserStatus(
          false,
        );
      } else {
        await updateUserStatus(true);

        await channel.track({
          user_id: user.id,
          online_at:
            new Date().toISOString(),
        });
      }
    };

  document.addEventListener(
    'visibilitychange',
    handleVisibility,
  );

  const handleUnload = async () => {
    await updateUserStatus(false);
  };

  window.addEventListener(
    'beforeunload',
    handleUnload,
  );

  return () => {
    document.removeEventListener(
      'visibilitychange',
      handleVisibility,
    );

    window.removeEventListener(
      'beforeunload',
      handleUnload,
    );

    if (heartbeatRef.current) {
      clearInterval(
        heartbeatRef.current,
      );
    }

    updateUserStatus(false);

    channel.unsubscribe();

    presenceChannelRef.current =
      null;
  };
}, [user, updateUserStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo(
  () => ({
    session,
    user,
    loading,

    onlineUsers,
    typingUsers,

    isOnline,

    startTyping,
    stopTyping,

    signOut,
  }),
  [
    session,
    user,
    loading,
    onlineUsers,
    typingUsers,
    isOnline,
    startTyping,
    stopTyping,
  ],
);

  return (
    
    <AuthContext.Provider value={value}>
      {children}
      {user && <PWAInstallPrompt />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
