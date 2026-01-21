# PWA 설정 가이드

## ✅ 완료된 설정

### 1. 로그인 유지
- ✅ Firebase Authentication을 사용하여 자동으로 로그인 상태 유지
- ✅ `onAuthStateChanged`를 통해 세션 관리
- 브라우저를 닫았다가 열어도 로그인 상태가 유지됩니다.

### 2. 오프라인 지원
- ✅ Service Worker 등록 완료
- ✅ 정적 리소스 캐싱 (HTML, CSS, JS, 이미지)
- ✅ API 응답 캐싱 (5분)
- 오프라인에서도 이전에 방문한 페이지를 볼 수 있습니다.

### 3. 푸시 알림
- ✅ 푸시 알림 기본 기능 구현
- ✅ 로그인 시 알림 권한 요청
- ✅ 테스트 알림 기능

## 🔧 추가 설정 필요

### 아이콘 파일 생성

현재 임시 아이콘을 사용 중입니다. 다음 경로에 실제 PNG 아이콘 파일을 추가해야 합니다:

1. **`public/icon-192.png`** (192x192 픽셀)
2. **`public/icon-512.png`** (512x512 픽셀)

#### 아이콘 생성 방법

**옵션 1: 온라인 도구 사용**
- https://realfavicongenerator.net/ 방문
- 로고 이미지 업로드
- PWA 아이콘 생성 및 다운로드

**옵션 2: 디자인 툴 사용**
- Figma, Canva 등에서 192x192, 512x512 크기로 제작
- PNG 형식으로 저장

### Firebase Cloud Messaging (FCM) 설정 (선택사항)

서버에서 푸시 알림을 보내려면:

1. Firebase Console (https://console.firebase.google.com) 접속
2. 프로젝트 설정 > 클라우드 메시징 탭
3. 웹 푸시 인증서 > 키 쌍 생성
4. VAPID 공개 키 복사
5. `src/components/PushNotification.js` 파일에서 `YOUR_VAPID_PUBLIC_KEY_HERE`를 실제 키로 교체

```javascript
// 예시:
applicationServerKey: urlBase64ToUint8Array(
  'BKx1234...' // 여기에 실제 VAPID 공개 키 입력
)
```

## 📱 PWA 설치 방법

### Android (Chrome)
1. 사이트 방문
2. 주소창 옆 "앱 설치" 버튼 클릭
3. 또는 메뉴 > "홈 화면에 추가"

### iOS (Safari)
1. 사이트 방문
2. 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. "추가" 탭

### Desktop (Chrome)
1. 사이트 방문
2. 주소창 오른쪽 설치 아이콘 클릭
3. "설치" 버튼 클릭

## 🧪 테스트 방법

### 오프라인 테스트
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 선택
3. "Offline" 체크박스 선택
4. 페이지 새로고침 - 여전히 작동해야 함

### Service Worker 확인
1. 개발자 도구 > Application 탭
2. Service Workers 확인
3. 상태가 "activated and is running" 이어야 함

### 푸시 알림 테스트
1. 로그인 후 알림 권한 허용
2. 콘솔에서 테스트:
```javascript
// 브라우저 콘솔에서 실행
new Notification('테스트', {
  body: '알림 테스트입니다',
  icon: '/icon-192.png'
});
```

## 📦 배포

PWA는 **HTTPS**에서만 작동합니다 (localhost 제외).

Vercel 배포 시 자동으로 HTTPS가 적용되므로 추가 설정 불필요합니다.

## 🔍 문제 해결

### Service Worker가 등록되지 않는 경우
- 프로덕션 빌드에서만 작동합니다 (`npm run build`)
- Vercel 배포 후 확인하세요

### 푸시 알림이 작동하지 않는 경우
1. HTTPS 환경인지 확인
2. 브라우저 알림 권한 확인
3. Firebase VAPID 키 설정 확인

### 아이콘이 표시되지 않는 경우
- icon-192.png, icon-512.png 파일 존재 확인
- manifest.json의 경로 확인
- 브라우저 캐시 삭제 후 재시도

## 📚 참고 자료

- [PWA 가이드](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging/js/client)
