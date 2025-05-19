import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';

// Prevent multiple server-side initializations
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// Directly use admin.auth() instead of assigning it to adminAuth
export const adminFirestore = admin.firestore();

// Authentication Service
export const AuthService = {
  // Create a new user with email and password
  async createUser(email: string, password: string, displayName?: string) {
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false
      });

      // Create a user document in Firestore
      await adminFirestore.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        roles: ['user'], // Default role
        status: 'active',
        lastLogin: null,
        profileCompleted: false
      });

      return userRecord;
    } catch (error) {
      console.error('Error creating new user:', error);
      throw new Error(`User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Verify and decode Firebase ID token
  async verifyIdToken(token: string) {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return null;
    }
  },

  // Manage user roles with enhanced error handling
  async setUserRole(uid: string, role: string) {
    try {
      await adminFirestore.collection('users').doc(uid).update({
        roles: admin.firestore.FieldValue.arrayUnion(role)
      });
      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      throw new Error(`Role update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Remove a specific role from user
  async removeUserRole(uid: string, role: string) {
    try {
      await adminFirestore.collection('users').doc(uid).update({
        roles: admin.firestore.FieldValue.arrayRemove(role)
      });
      return true;
    } catch (error) {
      console.error('Error removing user role:', error);
      throw new Error(`Role removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get user roles with fallback
  async getUserRoles(uid: string): Promise<string[]> {
    try {
      const userDoc = await adminFirestore.collection('users').doc(uid).get();
      return userDoc.data()?.roles || ['user'];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return ['user'];
    }
  },

  // Check if user has a specific role
  async userHasRole(uid: string, role: string): Promise<boolean> {
    const roles = await this.getUserRoles(uid);
    return roles.includes(role);
  },

  // Password reset with comprehensive error handling
  async sendPasswordResetEmail(email: string) {
    try {
      const link = await admin.auth().generatePasswordResetLink(email);
      // Implement email sending logic here (e.g., using Nodemailer or a transactional email service)
      return link;
    } catch (error) {
      console.error('Error generating password reset link:', error);
      throw new Error(`Password reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Update user profile
  async updateUserProfile(uid: string, updates: {
    displayName?: string;
    photoURL?: string;
    profileCompleted?: boolean;
  }) {
    try {
      await admin.auth().updateUser(uid, {
        displayName: updates.displayName,
        photoURL: updates.photoURL
      });
      
      // Update Firestore document with additional fields
      const updateData: Record<string, any> = {};
      if (updates.displayName) updateData.displayName = updates.displayName;
      if (updates.photoURL) updateData.photoURL = updates.photoURL;
      if (updates.profileCompleted !== undefined) updateData.profileCompleted = updates.profileCompleted;

      if (Object.keys(updateData).length > 0) {
        await adminFirestore.collection('users').doc(uid).update(updateData);
      }

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Profile update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Deactivate user account
  async deactivateUser(uid: string) {
    try {
      // Disable the user's account in Firebase Auth
      await adminAuth.updateUser(uid, { disabled: true });

      // Update user status in Firestore
      await adminFirestore.collection('users').doc(uid).update({
        status: 'inactive',
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw new Error(`User deactivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Reactivate user account
  async reactivateUser(uid: string) {
    try {
      // Enable the user's account in Firebase Auth
      await adminAuth.updateUser(uid, { disabled: false });

      // Update user status in Firestore
      await adminFirestore.collection('users').doc(uid).update({
        status: 'active',
        reactivatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error reactivating user:', error);
      throw new Error(`User reactivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

// Client-side Firebase configuration
export const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Client-side Firebase app initialization
export const clientApp = initializeApp(firebaseClientConfig);
export const clientAuth = getAuth(clientApp);

// Client-side authentication helpers
export const clientAuthHelpers = {
  signIn: signInWithEmailAndPassword,
  signUp: createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
};
