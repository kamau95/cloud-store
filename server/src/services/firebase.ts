import admin from "firebase-admin";

function parsePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  if (key.includes("-----BEGIN")) return key.replace(/\\n/g, "\n");
  try {
    return Buffer.from(key, "base64").toString("utf-8");
  } catch {
    return key;
  }
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const firebaseAdmin = admin;

export async function verifyIdToken(token: string) {
  try {
    return await admin.auth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export function getFirebaseConfig() {
  return {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
  };
}
