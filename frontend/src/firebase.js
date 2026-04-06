import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCch-NVfcwk11Y-2CEilwID4aGr7L7SIAk',
  authDomain: 'payday-il.firebaseapp.com',
  projectId: 'payday-il',
  storageBucket: 'payday-il.firebasestorage.app',
  messagingSenderId: '480322713440',
  appId: '1:480322713440:web:72c25890cab86f0c0f1005',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app;
