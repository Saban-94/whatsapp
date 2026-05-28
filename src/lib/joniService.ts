import { getDatabase, ref, push, serverTimestamp } from 'firebase/database';
import { app } from './firebase';

export interface JoniMessage {
  to: string;
  text: string;
  mediaUrl?: string;
}

/**
 * שולח הודעה דרך תשתית JONI על ידי דחיפת הנתונים ל-Realtime Database של Firebase
 * @param message אובייקט הודעה המכיל נמען, טקסט וקישור מדיה אופציונלי
 * @returns הבטחה (Promise) המחזירה boolean המציין האם השליחה הצליחה
 */
export async function sendViaJoni(message: JoniMessage): Promise<boolean> {
  try {
    // ניקוי מספר הטלפון מכל תווים שאינם ספרתיים
    const cleanedPhone = message.to.replace(/[^\d]/g, '');

    // בניית אובייקט הנתונים לפי הפרוטוקול המבוקש
    const payload: Record<string, any> = {
      to: cleanedPhone,
      text: message.text,
      timestamp: serverTimestamp(),
    };

    // אם קיים קישור למדיה, נוסיף אותו תחת המפתח 'file'
    if (message.mediaUrl) {
      payload.file = message.mediaUrl;
    }

    // אתחול ה-Database וביצוע ה-Push לראש תור joni_outbox
    const database = getDatabase(app);
    const outboxRef = ref(database, 'joni_outbox');

    await push(outboxRef, payload);

    console.log(`[JONI Service] הודעת וואטסאפ נרשמה בהצלחה לשליחה עבור: ${cleanedPhone}`);
    return true;
  } catch (error) {
    console.error('[JONI Service] כשל ברישום הודעת וואטסאפ דרך JONI במאגר:', error);
    return false;
  }
}
