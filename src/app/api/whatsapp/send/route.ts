import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { messageQueue } from '@/lib/queue';
import { initWorker } from '@/workers/senderWorker';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure worker is running in this process
  initWorker();

  const { template, tags, countryCode, status, manualNumbers } = await req.json();

  if (!template) {
    return NextResponse.json({ error: 'Template is required' }, { status: 400 });
  }

  // Check if user has an active socket
  // @ts-ignore
  const userSocket = global.activeSockets?.get(user.id);
  if (!userSocket) {
    return NextResponse.json({ 
      error: 'WhatsApp not connected. Please go to Settings to link your device.' 
    }, { status: 400 });
  }

  let targetContacts = [];

  // 1. Handle Manual Numbers
  if (manualNumbers && Array.isArray(manualNumbers) && manualNumbers.length > 0) {
    targetContacts = manualNumbers.map(num => ({
      phone_number: num,
      display_name: 'Contact'
    }));
  } 
  // 2. Handle Filtered Database Contacts
  else {
    let query = supabase
      .from('contacts')
      .select(`
        id, phone_number, display_name, country_code, status,
        contact_tags!inner(tag_id)
      `);

    if (status) query = query.eq('status', status);
    if (countryCode) query = query.eq('country_code', countryCode);
    
    if (tags && Array.isArray(tags) && tags.length > 0) {
      query = query.in('contact_tags.tag_id', tags);
    }

    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    targetContacts = data || [];

    // Apply AND logic if multiple tags are provided
    if (tags && tags.length > 1) {
      targetContacts = targetContacts.filter((contact: any) => {
        const contactTagIds = contact.contact_tags.map((t: any) => t.tag_id);
        return tags.every((requiredTagId: string) => contactTagIds.includes(requiredTagId));
      });
    }
  }

  if (targetContacts.length === 0) {
    return NextResponse.json({ error: 'No contacts found matching criteria' }, { status: 400 });
  }

  // Add job to queue
  await messageQueue.add(`bulk-send-${user.id}-${Date.now()}`, {
    userId: user.id,
    contacts: targetContacts,
    template
  });

  return NextResponse.json({ 
    success: true, 
    message: `Enqueued ${targetContacts.length} messages for sending.` 
  });
}
