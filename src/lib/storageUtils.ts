/**
 * Utility function to save a sanitized "slim" user object in LocalStorage.
 * This actively prevents QuotaExceededError by filtering out heavy objects or long base64 strings.
 */
export function saveUserLocally(user: any): void {
  if (!user) return;

  try {
    // 1. Create a "slim/lean" safe version of the user object
    const safeUser: any = {};

    // Only extract light, necessary user identifier properties
    const safeKeys = ['uid', 'name', 'email', 'photoUrl', 'phoneNumber', 'status', 'avatar'];
    
    for (const key of safeKeys) {
      if (user[key] !== undefined && user[key] !== null) {
        let val = user[key];
        
        // If the value is a string (like avatar or photoUrl) and is a heavy base64 string, filter it out
        if (typeof val === 'string') {
          const isBase64 = val.startsWith('data:') || val.length > 2000;
          if (isBase64) {
            console.warn(`[Storage Warning] Excluded massive base64 resource or heavy text from property: ${key}`);
            safeUser[key] = ''; // Store empty string instead of huge base64 to avoid QuotaExceededError
          } else {
            safeUser[key] = val;
          }
        } else if (Array.isArray(val)) {
          // Explicitly omit large arrays/nested structures
          console.warn(`[Storage Warning] Excluded heavy array structure from key: ${key}`);
          safeUser[key] = [];
        } else if (typeof val === 'object') {
          // Omit heavy inner objects
          console.warn(`[Storage Warning] Excluded heavy object/dictionary from key: ${key}`);
          safeUser[key] = {};
        } else {
          safeUser[key] = val;
        }
      }
    }

    // 2. Wrap setting item in try-catch
    const serialized = JSON.stringify(safeUser);
    localStorage.setItem('whatsapp_clone_user', serialized);
  } catch (error: any) {
    // 3. Handle QuotaExceededError and perform fallback recovery
    const isQuotaExceeded = 
      error.name === 'QuotaExceededError' || 
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
      error.code === 22;

    if (isQuotaExceeded) {
      console.warn('שגיאה: חריגה ממכסת שטח האחסון של LocalStorage (QuotaExceededError). מנקה את מפתח המשתמש כדי למנוע קריסה.');
      try {
        localStorage.removeItem('whatsapp_clone_user');
      } catch (removeErr) {
        console.error('כשל בניקוי מפתח המשתמש מ-LocalStorage:', removeErr);
      }
    } else {
      console.error('שגיאה לא צפויה בשמירת המשתמש ב-LocalStorage:', error);
    }
  }
}
