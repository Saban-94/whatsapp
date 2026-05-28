export function getApiUrl(path: string): string {
  const appUrl = (import.meta as any).env?.VITE_APP_URL || process.env.APP_URL || '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (appUrl) {
    try {
      const appOrigin = new URL(appUrl).origin;
      const currentOrigin = window.location.origin;
      
      // If we are running on a different origin (like Vercel) and not on localhost, use the absolute target API URL
      if (currentOrigin !== appOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
        return `${appOrigin}${cleanPath}`;
      }
    } catch (e) {
      console.error('[API Resolution] Invalid APP_URL:', appUrl);
    }
  }

  // Fallback for Vercel deployment when env variables are not set on Vercel
  const currentHost = window.location.hostname;
  if (currentHost.includes('vercel.app') && !appUrl) {
    return `https://ais-dev-gmxanj4odykr7oiafjb2k2-252744991733.europe-west3.run.app${cleanPath}`;
  }

  return cleanPath;
}
