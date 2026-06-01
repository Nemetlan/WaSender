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
      console.error('Error parsing WA session data, initializing new creds:', e);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  // Helper to save everything to DB
  const saveCreds = async () => {
    try {
      const sessionString = JSON.stringify({ creds, keys }, BufferJSON.replacer);
      const { error } = await supabase
        .from('wa_sessions')
        .upsert({ 
          user_id: userId, 
          session_data: JSON.parse(sessionString), 
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
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
            const key = `${type}-${id}`;
            if (keys[key]) {
              data[id] = keys[key];
            }
          }
          return data;
        },
        set: (data: any) => {
          let hasChanged = false;
          for (const type in data) {
            for (const id in data[type]) {
              const val = data[type][id];
              const key = `${type}-${id}`;
              if (val) {
                keys[key] = val;
              } else {
                delete keys[key];
              }
              hasChanged = true;
            }
          }

          if (hasChanged) {
            // Important: Auto-save when keys are updated to prevent E2EE sync issues
            saveCreds();
          }
        }
      }
    },
    saveCreds
  };
}
