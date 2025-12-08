'use server';

import { PageWrapper } from "@/components/page-wrapper";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getGroupsForUser } from "@/app/server/queries";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const groups = await getGroupsForUser();

    return (
        <PageWrapper>
            <div className="flex flex-col h-screen">
                <AppHeader userEmail={user.email} groups={groups} />
                <main className="flex-1 overflow-y-auto pb-24">
                    {children}
                </main>
                <BottomNavBar />
            </div>
        </PageWrapper>
    );
}
