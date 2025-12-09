import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export async function getSafeCookieStore(): Promise<ReadonlyRequestCookies> {
    try {
        const cookieHeader = cookies();
        const isPromise = cookieHeader instanceof Promise || (cookieHeader && typeof (cookieHeader as any).then === 'function');

        // console.log('[Cookies Debug] cookies() returned:', isPromise ? 'Promise' : 'Value', cookieHeader);

        const cookieStore = isPromise ? await cookieHeader : cookieHeader;

        // console.log('[Cookies Debug] resolved cookieStore:', cookieStore);
        return cookieStore;
    } catch (error) {
        console.error('Error getting cookie store:', error);
        throw error;
    }
}
