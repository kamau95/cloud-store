import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export async function getFirebase(): Promise<{ app: FirebaseApp; auth: Auth }> {
  if (app && auth) return { app, auth };
  const res = await fetch("/api/auth/config");
  const config = await res.json();
  app = initializeApp(config);
  auth = getAuth(app);
  return { app, auth };
}

export async function getAuthInstance(): Promise<Auth> {
  const { auth } = await getFirebase();
  return auth;
}
