import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";

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

// חיבור למאגר הספציפי
export const db = getFirestore(app, "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e");
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => auth.signOut();
