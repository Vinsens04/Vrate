import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/features/library/components/DashboardNav';
import { DashboardTopBar } from '@/features/library/components/DashboardTopBar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-app-bg text-app-text selection:bg-brand-primary selection:text-white">
      <DashboardNav userEmail={user.email} displayName={displayName} />
      <div className="flex flex-col md:pl-64">
        <DashboardTopBar displayName={displayName} />
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

