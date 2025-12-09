import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export async function getSafeCookieStore(): Promise<ReadonlyRequestCookies> {
    try {
        const cookieStore = await cookies();
        return cookieStore;
    } catch (error) {
        console.error('Error getting cookie store:', error);
        throw error;
    }
}
