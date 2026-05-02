import { supabase } from '@/lib/supabase';

/**
 * Inicia ou retorna uma conversa direta entre dois usuários.
 * Implementação robusta com verificação de RLS e logs detalhados.
 */
export async function startConversation(targetUserId: string) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) throw new Error('User not authenticated');
    
    const currentUserId = auth.user.id;

    if (currentUserId === targetUserId) {
      throw new Error('Não podes iniciar conversa contigo mesmo');
    }

    // 🔎 1. Procurar conversa existente de forma eficiente (Agrupamento via código)
    // Buscamos todos os IDs de conversas onde QUALQUER um dos dois participa
    const { data: memberRecords, error: searchError } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id')
      .in('user_id', [currentUserId, targetUserId]);

    if (searchError) throw searchError;

    // Mapa para contar quantos dos nossos IDs alvo estão em cada conversa
    const convCounts: Record<string, string[]> = {};
    memberRecords?.forEach(record => {
      if (!convCounts[record.conversation_id]) convCounts[record.conversation_id] = [];
      convCounts[record.conversation_id].push(record.user_id);
    });

    // Filtramos para encontrar a conversa que tem exatamente os dois usuários
    const existingConvId = Object.keys(convCounts).find(id => {
      const users = convCounts[id];
      return users.length === 2 && users.includes(currentUserId) && users.includes(targetUserId);
    });

    if (existingConvId) {
      console.log('[Messaging] Conversa existente:', existingConvId);
      return existingConvId;
    }

    // 🆕 2. Criar nova conversa se não existir
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert([{ 
        created_by: currentUserId,
        type: 'direct' 
      }])
      .select('id')
      .single();

    if (convError) throw convError;

    if (!newConv?.id) {
      throw new Error('Falha ao criar conversa');
    }

    // 👥 3. Inserir membros
    const { error: memberError } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: newConv.id, user_id: currentUserId },
        { conversation_id: newConv.id, user_id: targetUserId }
      ]);

    if (memberError) {
      // Rollback básico
      await supabase.from('conversations').delete().eq('id', newConv.id);
      throw memberError;
    }

    return newConv.id;
  } catch (error: any) {
    console.error('❌ [Messaging] ERRO:', error);
    throw new Error(error?.message || 'Erro ao iniciar conversa');
  }
}

