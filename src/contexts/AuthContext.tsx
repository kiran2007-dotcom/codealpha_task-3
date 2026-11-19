import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { createUserProfile } from '../services/socialService';
import type { UserPublic } from '../types/social';

interface PendingProfileData {
  fullName: string;
  username: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  userProfile: UserPublic | null;
  authLoading: boolean;
  profileLoading: boolean;
  isEmailVerified: boolean;
  needsProfileSetup: boolean;
  isPrototypeMode: boolean;
  enterPrototypeMode: () => void;
  exitPrototypeMode: () => void;
  registerWithEmail: (params: {
    email: string;
    password: string;
    fullName: string;
    username: string;
  }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  completeProfileSetup: (fullName: string, username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PENDING_PROFILE_STORAGE_KEY = 'connectsphere_pending_profile';
const PROTOTYPE_ACTIVE_KEY = 'connectsphere_prototype_active';

function savePendingProfile(uid: string, data: PendingProfileData) {
  try {
    localStorage.setItem(`${PENDING_PROFILE_STORAGE_KEY}_${uid}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function loadPendingProfile(uid: string): PendingProfileData | null {
  try {
    const raw = localStorage.getItem(`${PENDING_PROFILE_STORAGE_KEY}_${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as PendingProfileData;
  } catch {
    return null;
  }
}

function clearPendingProfile(uid: string) {
  try {
    localStorage.removeItem(`${PENDING_PROFILE_STORAGE_KEY}_${uid}`);
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserPublic | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [verificationTick, setVerificationTick] = useState(0);
  const [isPrototypeMode, setIsPrototypeMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PROTOTYPE_ACTIVE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        setIsPrototypeMode(false);
        try {
          localStorage.removeItem(PROTOTYPE_ACTIVE_KEY);
        } catch {
          // Ignore
        }
      } else {
        setUserProfile(null);
        setProfileLoading(false);
        setNeedsProfileSetup(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    setProfileLoading(true);
    const userDocRef = doc(db, 'users', firebaseUser.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserPublic);
          setNeedsProfileSetup(false);
          setProfileLoading(false);
          clearPendingProfile(firebaseUser.uid);
        } else {
          const pending = loadPendingProfile(firebaseUser.uid);
          if (firebaseUser.emailVerified && pending && firebaseUser.email) {
            try {
              const created = await createUserProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                fullName: pending.fullName,
                username: pending.username,
                avatarUrl: firebaseUser.photoURL || '',
              });
              clearPendingProfile(firebaseUser.uid);
              setUserProfile(created);
              setNeedsProfileSetup(false);
            } catch {
              setNeedsProfileSetup(true);
            }
          } else {
            setUserProfile(null);
            setNeedsProfileSetup(firebaseUser.emailVerified);
          }
          setProfileLoading(false);
        }
      },
      (error) => {
        setProfileLoading(false);
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      }
    );

    return unsubscribe;
  }, [firebaseUser, verificationTick]);

  const enterPrototypeMode = () => {
    setIsPrototypeMode(true);
    try {
      localStorage.setItem(PROTOTYPE_ACTIVE_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  const exitPrototypeMode = () => {
    setIsPrototypeMode(false);
    try {
      localStorage.removeItem(PROTOTYPE_ACTIVE_KEY);
    } catch {
      // Ignore
    }
  };

  const registerWithEmail = async (params: {
    email: string;
    password: string;
    fullName: string;
    username: string;
  }) => {
    const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
    await updateProfile(cred.user, { displayName: params.fullName.trim() });
    savePendingProfile(cred.user.uid, {
      fullName: params.fullName.trim(),
      username: params.username.trim(),
    });
    await sendEmailVerification(cred.user);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (isPrototypeMode) {
      exitPrototypeMode();
      return;
    }
    await signOut(auth);
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('No active user session.');
    await sendEmailVerification(auth.currentUser);
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const refreshed = auth.currentUser;
    setFirebaseUser(refreshed);
    setVerificationTick((t) => t + 1);
    return refreshed.emailVerified;
  };

  const completeProfileSetup = async (fullName: string, username: string) => {
    if (!auth.currentUser) throw new Error('You must be signed in.');
    const created = await createUserProfile({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || '',
      fullName,
      username,
      avatarUrl: auth.currentUser.photoURL || '',
    });
    clearPendingProfile(auth.currentUser.uid);
    setUserProfile(created);
    setNeedsProfileSetup(false);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        authLoading,
        profileLoading,
        isEmailVerified: Boolean(firebaseUser?.emailVerified),
        needsProfileSetup,
        isPrototypeMode,
        enterPrototypeMode,
        exitPrototypeMode,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        logout,
        resendVerificationEmail,
        refreshVerificationStatus,
        completeProfileSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
