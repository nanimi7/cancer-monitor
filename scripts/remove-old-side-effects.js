const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
require('dotenv').config();

// Firebase 클라이언트 SDK 초기화
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeOldSideEffects() {
  console.log('🚀 기존 부작용 데이터 정리 시작...\n');

  try {
    // 모든 사용자 가져오기
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    if (usersSnapshot.empty) {
      console.log('❌ 사용자가 없습니다.');
      return;
    }

    let totalUsers = 0;
    let totalRecords = 0;
    let updatedRecords = 0;

    // 각 사용자의 symptomRecords 처리
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`\n👤 사용자 처리 중: ${userId}`);
      totalUsers++;

      const symptomRecordsRef = collection(db, `users/${userId}/symptomRecords`);
      const recordsSnapshot = await getDocs(symptomRecordsRef);

      if (recordsSnapshot.empty) {
        console.log('   ℹ️  증상 기록 없음');
        continue;
      }

      console.log(`   📊 총 ${recordsSnapshot.size}개의 기록 발견`);
      totalRecords += recordsSnapshot.size;

      // 각 레코드 처리
      for (const recordDoc of recordsSnapshot.docs) {
        const data = recordDoc.data();

        // sideEffects 배열이 있고, "심한졸림" 또는 "심한피로"가 포함되어 있는지 확인
        if (data.sideEffects && Array.isArray(data.sideEffects)) {
          const originalSideEffects = [...data.sideEffects];
          const filteredSideEffects = data.sideEffects.filter(
            effect => effect !== '심한졸림' && effect !== '심한피로'
          );

          // 변경사항이 있는 경우에만 업데이트
          if (originalSideEffects.length !== filteredSideEffects.length) {
            const updateData = {
              sideEffects: filteredSideEffects
            };

            const recordRef = doc(db, `users/${userId}/symptomRecords`, recordDoc.id);
            await updateDoc(recordRef, updateData);
            updatedRecords++;

            console.log(`   ✅ 업데이트: ${recordDoc.id} (날짜: ${data.date})`);
            console.log(`      제거 전: [${originalSideEffects.join(', ')}]`);
            console.log(`      제거 후: [${filteredSideEffects.join(', ')}]`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ 데이터 정리 완료!');
    console.log('='.repeat(60));
    console.log(`📊 총 사용자 수: ${totalUsers}`);
    console.log(`📊 총 기록 수: ${totalRecords}`);
    console.log(`✅ 업데이트된 기록: ${updatedRecords}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 데이터 정리 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
removeOldSideEffects()
  .then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
