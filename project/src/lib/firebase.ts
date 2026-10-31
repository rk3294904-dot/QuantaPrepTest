import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyBT4iHh_9NCtAgO3EWoaDXpQYUzqItYbHM',
  authDomain: 'quanta-prep-test.firebaseapp.com',
  projectId: 'quanta-prep-test',
  storageBucket: 'quanta-prep-test.firebasestorage.app',
  messagingSenderId: '317342109811',
  appId: '1:317342109811:web:be3f541f41b3006b2ada06',
  measurementId: 'G-TYG89C6XMD',
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
