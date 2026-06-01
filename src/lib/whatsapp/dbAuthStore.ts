// src/lib/whatsapp/dbAuthStore.ts
import { AuthenticationState, AuthenticationCreds, BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import { SupabaseClient } from '@supabase/supabase-js';

export async function useSupabaseAuthStore(supabase: SupabaseClient, userId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> {
  
  // 1. Fetch existing session data from Supabase
  const { data, error } = await supabase
    .from('wa_sessions')
    .select('session_data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching WA session:', error);
  }

  let creds: AuthenticationCreds;
  let keys: any = {};

  if (data?.session_data) {
    try {
      const parsed = JSON.parse(
        typeof data.session_data === 'string' ? data.session_data : JSON.stringify(data.session_data), 
        BufferJSON.reviver
      );
      creds = parsed.creds;
      keys = parsed.keys || {};
    } catch (e) {
      console.error('Error parsing WA session data:', e);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  const saveCreds = async () => {
    try {
      const sessionString = JSON.stringify({ creds, keys }, BufferJSON.replacer);
      const { error } = await supabase
        .from('wa_sessions')
        .upsert({ 
          user_id: userId, 
          session_data: JSON.parse(sessionString), // Store as JSONB
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      console.log(`Saved WA credentials for user ${userId}`);
    } catch (e) {
      console.error('Failed to save WA credentials:', e);
    }
  };

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data: any = {};
          for (const id of ids) {
            data[id] = keys[`${type}-${id}`];
          }
          return data;
        },
        set: (data: any) => {
          for (const type in data) {
            const typedType = type as keyof typeof data;
            for (const id in data[typedType]) {
              const val = data[typedType][id];
              if (val === null) {
                delete keys[`${type}-${id}`];
              } else {
                keys[`${type}-${id}`] = val;
              }
            }
          }
        }
      }
    },
    saveCreds
  };
}
