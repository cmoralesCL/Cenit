
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getCurrentUserId() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('User not authenticated for seeding.');
        return null;
    }
    return user.id;
}

export async function GET() {
  // Protect this route in a real app
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const userId = await getCurrentUserId();
  
  if (!userId) {
     return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  try {
    await seedDatabase(userId);
    return NextResponse.json({ message: 'Database seeded successfully!' });
  } catch (error) {
    console.error('Seeding failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Seeding failed', details: errorMessage }, { status: 500 });
  }
}

    