import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type User = { email: string; name?: string };

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loginAsGuest: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  loginAsGuest: async () => {},
});

const USERS_KEY = "demo_users";
const SESSION_KEY = "demo_session";
const TEST_EMAIL = "tern123@gmail.com";   // Testing email
const TEST_USER = { name: "TERN Tester", password: "123456" };

type StoredUser = { name?: string; password: string };

function readUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeUsers(db: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(db));
}

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(u: User | null) {
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
}

(function ensureSeed() {
  const db = readUsers();
  if (!db["demo@local"]) {
    db["demo@local"] = { name: "Demo", password: "12345678" };
    writeUsers(db);
  }
})();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSession());

  const login = async (email: string, password: string) => {
    const db = readUsers();
    const found = db[email];
    await delay(300); 
    if (!found || found.password !== password) {
      throw new Error("Invalid email or password");
    }
    const u: User = { email, name: found.name };
    setUser(u);
    writeSession(u);
  };

  const signup = async (name: string, email: string, password: string) => {
    const db = readUsers();
    await delay(300);
    if (db[email]) throw new Error("Email already exists");
    db[email] = { name, password };
    writeUsers(db);
    const u: User = { email, name };
    setUser(u);
    writeSession(u);
  };

  const loginAsGuest = async () => {
    await delay(150);
    const u: User = { email: "guest@local", name: "Guest" };
    setUser(u);
    writeSession(u);
  };

  const logout = () => {
    setUser(null);
    writeSession(null);
  };


  useEffect(() => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) setUser(JSON.parse(raw));
  const users = readUsers();
  if (!users[TEST_EMAIL]) {
    users[TEST_EMAIL] = TEST_USER;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}, []);

  const value = useMemo(() => ({ user, login, signup, logout, loginAsGuest }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
