/**
 * Constructs an Android Chrome Intent URL to break out of in-app WebViews.
 * Strips http/https and properly encodes Arabic or special query parameters.
 */
export function buildAndroidChromeIntent(rawUrl?: string): string {
  const targetUrl = rawUrl || (typeof window !== 'undefined' ? window.location.href : 'https://techeeer.app/');
  const cleanUrl = targetUrl.replace(/^https?:\/\//i, '');
  const encodedCleanUrl = encodeURI(cleanUrl);
  return `intent://${encodedCleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
}
