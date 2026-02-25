import { getAdminAuth, getAdminFirestore } from './_lib/firebaseAdmin.js';
import { applyCors, verifyUser } from './_lib/security.js';

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await verifyUser(req);
    const uid = decoded.uid;

    const db = getAdminFirestore();
    const userDocRef = db.collection('users').doc(uid);
    await db.recursiveDelete(userDocRef);
    await getAdminAuth().deleteUser(uid);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('회원탈퇴 서버 처리 오류:', error);
    return res.status(error.statusCode || 500).json({
      error: '회원탈퇴 처리 중 오류가 발생했습니다.',
      details: error.statusCode ? `${error.statusCode}: ${error.message}` : error.message,
    });
  }
}
