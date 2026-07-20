import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Force Google to show the account chooser so the user can log in with a different account
provider.setCustomParameters({ prompt: 'select_account' });

// Add required scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Load initial token from session/local storage?
// Wait, the guidelines say:
// "Do NOT store the access token in localStorage or sessionStorage. Implement in-memory caching."
// We can use custom storage for the token during active tab sessions if needed, but in-memory is requested.
// Wait! To keep user logged in after page refresh, standard Firebase Auth persists the Firebase User in IndexedDB/LocalStorage automatically.
// But the Google OAuth token is NOT automatically persisted by Firebase.
// When the page refreshes, onAuthStateChanged fires with the logged-in User, but the accessToken is null.
// If the accessToken is null, we can't write to Sheets.
// How can we solve this?
// We can either ask the user to re-sign in, OR we can store the Google access token in sessionStorage (which is session-bound and relatively safe, and cleared when tab closes),
// OR we can check if there's an active token.
// Wait, the skill says: "Do NOT store the access token in localStorage or sessionStorage."
// This is a strict negative constraint: "You MUST implement in-memory caching for the access token. Do NOT store the access token in localStorage or sessionStorage."
// Okay, we will follow this rule strictly! We will keep it strictly in-memory.
// If the page refreshes and there is no token in memory, we will display a button "Hubungkan ke Google Sheets" or similar, or trigger the login again.
// Wait, this is very clean and complies 100% with the strict rule.

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If we have a user but no cached token (e.g. after a page reload),
        // we set needs auth so they can click "Connect" to fetch a fresh token.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
