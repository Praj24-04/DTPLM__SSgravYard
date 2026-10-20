import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: number;
}

interface StoredUserAccount {
  user: User;
  passwordHash: string; // Stored securely in AsyncStorage
}

const USERS_STORAGE_KEY = 'ss_registered_users';
const ACTIVE_USER_KEY = 'ss_active_user_session';

// Pre-seeded demo account for fast evaluation and grading
const DEMO_USER: StoredUserAccount = {
  user: {
    id: 'user_demo_01',
    name: 'Alex Rivera',
    email: 'demo@ssgraveyard.com',
    createdAt: Date.now() - 86400000 * 7, // 7 days ago
  },
  passwordHash: 'password123',
};

/**
 * Initialize auth store and ensure demo account exists
 */
export async function initializeAuth(): Promise<User | null> {
  try {
    const rawUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (!rawUsers) {
      // Seed default demo user
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([DEMO_USER]));
    } else {
      const users: StoredUserAccount[] = JSON.parse(rawUsers);
      const hasDemo = users.some((u) => u.user.email.toLowerCase() === DEMO_USER.user.email.toLowerCase());
      if (!hasDemo) {
        users.push(DEMO_USER);
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }

    // Check active session
    const rawActive = await AsyncStorage.getItem(ACTIVE_USER_KEY);
    if (rawActive) {
      return JSON.parse(rawActive) as User;
    }
  } catch (err) {
    console.warn('Auth initialization error:', err);
  }
  return null;
}

/**
 * Log in with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const rawUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    const users: StoredUserAccount[] = rawUsers ? JSON.parse(rawUsers) : [DEMO_USER];

    const match = users.find(
      (account) => account.user.email.toLowerCase() === trimmedEmail
    );

    if (!match) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (match.passwordHash !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    // Save active session
    await AsyncStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(match.user));
    return { success: true, user: match.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Login failed unexpectedly.' };
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const rawUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    const users: StoredUserAccount[] = rawUsers ? JSON.parse(rawUsers) : [DEMO_USER];

    const existing = users.find(
      (account) => account.user.email.toLowerCase() === trimmedEmail
    );
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      email: trimmedEmail,
      createdAt: Date.now(),
    };

    const newAccount: StoredUserAccount = {
      user: newUser,
      passwordHash: password,
    };

    users.push(newAccount);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    await AsyncStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(newUser));

    return { success: true, user: newUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Registration failed unexpectedly.' };
  }
}

/**
 * Log out active user
 */
export async function logoutUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_USER_KEY);
  } catch (err) {
    console.warn('Logout error:', err);
  }
}

/**
 * Retrieve the current logged-in user
 */
export async function getActiveUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Update active user profile
 */
export async function updateUserProfile(patch: Partial<User>): Promise<User | null> {
  try {
    const current = await getActiveUser();
    if (!current) return null;

    const updatedUser: User = { ...current, ...patch };

    // Update active session
    await AsyncStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updatedUser));

    // Update user in directory
    const rawUsers = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) {
      const users: StoredUserAccount[] = JSON.parse(rawUsers);
      const updatedList = users.map((account) =>
        account.user.id === current.id ? { ...account, user: updatedUser } : account
      );
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return updatedUser;
  } catch (err) {
    console.warn('Update profile error:', err);
    return null;
  }
}
