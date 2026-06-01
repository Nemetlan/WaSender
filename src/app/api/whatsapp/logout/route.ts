import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// @ts-ignore
global.activeSockets = global.activeSockets || new Map();

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Close and remove the active socket from memory
    // @ts-ignore
    const sock = global.activeSockets.get(user.id);
    if (sock) {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.logout(); // This tells Baileys to send a logout signal to WA
      sock.end(undefined);
      // @ts-ignore
      global.activeSockets.delete(user.id);
    }

    // 2. Delete the session from Supabase
    const { error } = await supabase
      .from('wa_sessions')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
