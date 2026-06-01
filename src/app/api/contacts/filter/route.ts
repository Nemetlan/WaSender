// src/app/api/contacts/filter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { tags, comment, status } = await req.json(); // tags is array of UUIDs

  let query = supabase
    .from('contacts')
    .select(`
      id, phone_number, display_name, comment, status,
      contact_tags!inner(tag_id)
    `);

  if (status) query = query.eq('status', status);
  if (comment) query = query.ilike('comment', `%${comment}%`);
  
  // Handle complex strict AND tag intersection logic
  if (tags && tags.length > 0) {
    query = query.in('contact_tags.tag_id', tags);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Post-filter to assert client-side strict relational intersection (AND Logic verification)
  const filteredData = data.filter((contact: any) => {
    const contactTagIds = contact.contact_tags.map((t: any) => t.tag_id);
    return tags.every((requiredTagId: string) => contactTagIds.includes(requiredTagId));
  });

  return NextResponse.json({ contacts: filteredData });
}
