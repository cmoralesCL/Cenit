import { createServerClient } from '@supabase/ssr';

function formatLogMessage(error: any, contextData?: any): { message: string, details: any } {
    let message = '';
    let details: any = { ...contextData };

    if (error instanceof Error) {
        message = error.message;
        details.stack = error.stack;
        details.name = error.name;
    } else if (typeof error === 'object' && error !== null) {
        message = error.message || 'Unknown Error Object';
        details.rawError = error;
    } else {
        message = String(error);
    }

    return { message, details };
}

export async function logError(error: any, contextData?: any): Promise<void> {
    // 1. Console Log (Always keep for immediate feedback/build logs)
    console.error("--- SYSTEM LOG ---");
    console.error("Error:", error);
    if (contextData) console.error("Context:", contextData);

    // 2. Persist to Supabase
    try {
        // Use a direct admin client to avoid recursive errors if the main createClient depends on broken cookies
        // and to allow logging even if session is invalid.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!serviceRoleKey) {
            console.error("Logger Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Skipping DB log.");
            return;
        }

        const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
            cookies: {
                get(name: string) { return undefined; },
                set(name: string, value: string, options: any) { },
                remove(name: string, options: any) { },
            },
        });

        const { message, details } = formatLogMessage(error, contextData);

        // Attempt to extract user_id if present in context or we could fetch it (but costly)
        // contextData often has 'userId' or we let it be null.
        const userId = contextData?.userId || contextData?.user_id || null;
        const path = contextData?.path || null;

        await supabase.from('system_logs').insert({
            level: 'error',
            message: message.substring(0, 1000), // Truncate specific content if too long
            details: details,
            user_id: userId,
            path: path,
            environment: process.env.NODE_ENV || 'development'
        });

    } catch (loggingError) {
        // Fallback: If DB logging fails, just strictly console error.
        // This prevents infinite loops if DB connection itself is the error.
        console.error("CRITICAL: Failed to log error to database.", loggingError);
    }
}
