import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export async function getFirebase(): Promise<{ app: FirebaseApp; auth: Auth }> {
  if (app && auth) return { app, auth };
  try {
    const res = await fetch("/api/auth/config");
    if (!res.ok) throw new Error("Failed to fetch Firebase config");
    const config = await res.json();
    app = initializeApp(config);
    auth = getAuth(app);
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
    throw err;
  }
  return { app, auth };
}

export async function getAuthInstance(): Promise<Auth> {
  const { auth } = await getFirebase();
  return auth;
}
