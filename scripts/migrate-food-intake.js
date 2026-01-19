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

async function migrateFoodIntakeData() {
  console.log('🚀 식사량 데이터 마이그레이션 시작...\n');

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
    let migratedRecords = 0;

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

        // foodIntakeNote가 있고, foodIntakeBreakfast가 없는 경우만 마이그레이션
        if (data.foodIntakeNote &&
            data.foodIntakeNote.trim() !== '' &&
            !data.foodIntakeBreakfast) {

          const updateData = {
            foodIntakeBreakfast: data.foodIntakeNote,
            // foodIntakeNote는 유지 (기존 데이터 호환성)
          };

          const recordRef = doc(db, `users/${userId}/symptomRecords`, recordDoc.id);
          await updateDoc(recordRef, updateData);
          migratedRecords++;

          console.log(`   ✅ 마이그레이션: ${recordDoc.id} (날짜: ${data.date})`);
          console.log(`      내용: ${data.foodIntakeNote.substring(0, 50)}${data.foodIntakeNote.length > 50 ? '...' : ''}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ 마이그레이션 완료!');
    console.log('='.repeat(60));
    console.log(`📊 총 사용자 수: ${totalUsers}`);
    console.log(`📊 총 기록 수: ${totalRecords}`);
    console.log(`✅ 마이그레이션된 기록: ${migratedRecords}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
migrateFoodIntakeData()
  .then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
