import { NextResponse } from 'next/server';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        throw new Error("Test Error for System Logs Verification");
    } catch (error) {
        await logError(error, {
            at: 'api/test-log',
            details: 'Manual test triggered via Browser/API',
            userId: 'test-user-id'
        });

        return NextResponse.json({
            message: "Error triggered and logged (check console/Supabase)",
            tableInfo: "If this failed, ensure 'system_logs' table exists in Supabase."
        });
    }
}
