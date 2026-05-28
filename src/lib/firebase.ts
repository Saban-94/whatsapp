import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, push, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAQzXHpiSVBqbU1zXVXtl4tDtEPnqkdeUI",
  authDomain: "saban-ai-drive.firebaseapp.com",
  projectId: "saban-ai-drive",
  storageBucket: "saban-ai-drive.firebasestorage.app",
  messagingSenderId: "516446483197",
  appId: "1:516446483197:web:21fc622f56c4e2a3050494"
};

// מניעת שגיאות אתחול כפול בטעינה חמה
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// חיבור למאגרים הספציפיים
export const db = getFirestore(app, "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e");
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/contacts");

export const loginAndGetAccessToken = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  return {
    user: result.user,
    accessToken: credential?.accessToken || null,
  };
};

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => auth.signOut();

/**
 * שולח הודעה דרך JONI למימוש תקשורת וואטסאפ מול הלקוחות.
 * ההודעה נכתבת ל-Firebase Realtime Database ול-Firestore במקביל,
 * באריזת JSON המכילה את מספר הטלפון, תוכן ההודעה, קבצים מצורפים וחותמת זמן.
 */
export const sendJoniMessage = async (phoneNumber: string, text: string, mediaType: string = "text", mediaUrl?: string) => {
  const sanitizedPhone = phoneNumber ? phoneNumber.replace(/[^\d+]/g, "") : "";
  const payload = {
    phoneNumber: sanitizedPhone,
    text,
    mediaType,
    mediaUrl: mediaUrl || null,
    timestamp: new Date().toISOString(),
    source: "Saban AI Drive PWA",
    status: "pending_joni"
  };

  const results = { rtdb: false, firestore: false, error: null as any };

  // 1. כתיבה ל-Firebase Realtime DB (תמיכה בתוסף JONI RTDB)
  try {
    const outboxRef = ref(rtdb, "joni_outbox");
    const newMsgRef = push(outboxRef);
    await set(newMsgRef, payload);
    results.rtdb = true;
    console.log("JONI RTDB message queued:", newMsgRef.key);
  } catch (error: any) {
    console.error("JONI RTDB Push Failed:", error);
    results.error = error;
  }

  // 2. כתיבה ל-Firestore (תמיכה בתוסף JONI Firestore)
  try {
    const colRef = collection(db, "joni_outbox");
    const docRef = await addDoc(colRef, payload);
    results.firestore = true;
    console.log("JONI Firestore message queued:", docRef.id);
  } catch (error: any) {
    console.error("JONI Firestore Add Failed:", error);
    results.error = error;
  }

  return results;
};
