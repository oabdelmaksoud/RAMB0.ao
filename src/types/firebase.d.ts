// Custom type declarations for Firebase
declare module 'firebase/app' {
  import { FirebaseApp, FirebaseOptions } from '@firebase/app';
  export function initializeApp(options: FirebaseOptions): FirebaseApp;
}

declare module 'firebase/auth' {
  import { Auth } from '@firebase/auth';
  export function getAuth(app?: any): Auth;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<any>;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<any>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, callback: (user: any | null) => void): () => void;
}
