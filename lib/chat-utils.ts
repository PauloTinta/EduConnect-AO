import { supabase } from './supabase';
import { Message } from './chat-types';

/**
 * Carrega a conversa e seus participantes.
 * Trata o erro de recursão infinita se as policies não estiverem corretas.
 */
export async function getConversationDetails(conversationId: string, currentUserId: string) {
  const { data: members, error } = await supabase
    .from('conversation_members')
    .select('user_id, profiles:profiles!inner(full_name, avatar_url, username)')
    .eq('conversation_id', conversationId);

  if (error) {
    console.error('❌ [getConversationDetails] Supabase Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  // Supabase might return profiles as an array depending on the auto-generated types
  const formattedMembers = (members || []).map(m => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
  }));

  const otherParticipant = formattedMembers.find(p => p.user_id !== currentUserId);
  
  return {
    members: formattedMembers,
    otherParticipant: otherParticipant || null
  };
}

/**
 * Upload de media para o bucket chat-media.
 */
export async function uploadChatMedia(file: File, conversationId: string) {
  const ext = file.name.split('.').pop();
  const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  
  const { data, error } = await supabase.storage
    .from('chat-media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: publicData } = supabase.storage
    .from('chat-media')
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

/**
 * Marca mensagens como lidas na conversa.
 */
export async function markMessagesAsSeen(conversationId: string, currentUserId: string) {
  await supabase
    .from('messages')
    .update({ seen_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .is('seen_at', null);
}

/**
 * Apaga uma mensagem (Soft Delete).
 */
export async function deleteMessage(messageId: string, forEveryone = true) {
  try {
    if (forEveryone) {
      const { error, data } = await supabase
        .from('messages')
        .update({ 
          deleted_at: new Date().toISOString(),
          content: 'Esta mensagem foi apagada',
          media_url: null,
          media_type: 'text'
        })
        .eq('id', messageId)
        .select();

      if (error) {
        console.error('❌ [deleteMessage] Supabase Error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          messageId
        });
        throw error;
      }

      console.log('✅ [deleteMessage] Success:', data);
      return data;
    } else {
      // Apagar só para mim normalmente exigiria uma tabela de exclusão por usuário.
      // Para simplificar neste MVP, fazemos apenas para todos se for o sender.
      console.warn('⚠️ [deleteMessage] ForEveryone=false not implemented');
    }
  } catch (err) {
    console.error('❌ [deleteMessage] Unexpected Error:', err);
    throw err;
  }
}

/**
 * Edita o conteúdo de uma mensagem.
 */
export async function editMessage(messageId: string, newContent: string) {
  try {
    const { error, data } = await supabase
      .from('messages')
      .update({ 
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select();

    if (error) {
      console.error('❌ [editMessage] Supabase Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        messageId,
        newContent
      });
      throw error;
    }

    console.log('✅ [editMessage] Success:', data);
    return data;
  } catch (err) {
    console.error('❌ [editMessage] Unexpected Error:', err);
    throw err;
  }
}

/**
 * Busca todas as conversas do usuário com o último detalhe.
 */
export async function getUserConversations(userId: string) {
  const { data: memberData, error } = await supabase
    .from('conversation_members')
    .select(`
      conversation_id,
      conversations:conversations!inner(
        id,
        created_at,
        created_by,
        last_message:messages(content, created_at, sender_id, type)
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  // Obter detalhes dos outros participantes para cada conversa
  const conversations = await Promise.all((memberData || []).map(async (m: any) => {
    const convId = m.conversation_id;
    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select('user_id, profiles(full_name, avatar_url, username, last_seen)')
      .eq('conversation_id', convId);

    const otherMember = (otherMembers || []).find((om: any) => om.user_id !== userId);
    
    // Unread count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', convId)
      .neq('sender_id', userId)
      .is('seen_at', null);

    // Last message processing
    const lastMsgs = m.conversations.last_message || [];
    const lastMsg = lastMsgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    return {
      id: convId,
      otherParticipant: otherMember?.profiles,
      otherParticipantId: otherMember?.user_id,
      lastMessage: lastMsg?.content || (lastMsg?.type === 'image' ? '🖼 Foto' : '📎 Media'),
      lastMessageTime: lastMsg?.created_at,
      unreadCount: count || 0
    };
  }));

  return conversations.sort((a, b) => {
    const timeA = new Date(a.lastMessageTime || 0).getTime();
    const timeB = new Date(b.lastMessageTime || 0).getTime();
    return timeB - timeA;
  });
}
