import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export async function getSafeCookieStore(): Promise<ReadonlyRequestCookies> {
    try {
        const cookieStorePromise = cookies();
        // console.log('[Cookies Debug] cookies() called. Is Promise?', cookieStorePromise instanceof Promise);
        const cookieStore = await cookieStorePromise;
        // console.log('[Cookies Debug] cookies() awaited. Type:', typeof cookieStore);
        return cookieStore;
    } catch (error) {
        console.error('Error getting cookie store:', error);
        throw error;
    }
}
