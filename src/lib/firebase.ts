import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, push, set } from "firebase/database";
import firebaseConfig from "../../firebase-applet-config.json";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// מניעת שגיאות אתחול כפול בטעינה חמה
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// שליפת מזהה מסד הנתונים מתוך הגדרות המערכת, או שימוש במזהה הקיים כגיבוי, עם מנגנון מניעת קריסה
let dbInstance;
try {
  const configDatabaseId = (firebaseConfig as any).firestoreDatabaseId || (firebaseConfig as any).databaseId;
  const targetDbId = configDatabaseId || "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e";
  
  if (targetDbId) {
    try {
      dbInstance = getFirestore(app, targetDbId);
    } catch (innerErr) {
      console.warn("Could not initialize with custom database ID, falling back to default database:", innerErr);
      dbInstance = getFirestore(app);
    }
  } else {
    dbInstance = getFirestore(app);
  }
} catch (e) {
  console.error("Critical Firestore initialization failure:", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/contacts");
googleProvider.addScope("https://www.googleapis.com/auth/tasks");

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
  const pathForWrite = "office_messages";
  try {
    const colRef = collection(db, pathForWrite);
    const docRef = await addDoc(colRef, payload);
    results.firestore = true;
    console.log("JONI Firestore message queued:", docRef.id);
  } catch (error: any) {
    console.error("JONI Firestore Add Failed:", error);
    results.error = error;
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }

  return results;
};

