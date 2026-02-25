import admin from 'firebase-admin';

function getPrivateKey() {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) return undefined;
  return rawKey.replace(/\\n/g, '\n');
}

export function getAdminAuth() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin.auth();
}

export function getAdminFirestore() {
  if (!admin.apps.length) {
    getAdminAuth();
  }
  return admin.firestore();
}
