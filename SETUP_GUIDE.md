# 항암치료 기록 서비스 - 설치 및 테스트 가이드

## 1단계: NPM 설치 문제 해결

현재 npm 캐시에 권한 문제가 있습니다. 다음 중 하나의 방법으로 해결하세요.

### 방법 1: 캐시 권한 수정 (권장)
```bash
sudo chown -R $(whoami) ~/.npm
```

그 다음:
```bash
npm install
```

### 방법 2: 다른 패키지 매니저 사용
```bash
# Yarn 사용
npm install -g yarn
yarn install
```

---

## 2단계: Firebase 프로젝트 설정

### 2-1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: "cancer-treatment-tracker")
4. Google 애널리틱스는 선택사항 (Skip 가능)
5. 프로젝트 생성 완료

### 2-2. Firestore Database 설정

1. Firebase Console 왼쪽 메뉴에서 "빌드" > "Firestore Database" 선택
2. "데이터베이스 만들기" 클릭
3. **테스트 모드**로 시작 선택 (개발용)
4. Cloud Firestore 위치 선택 (예: asia-northeast3 - 서울)
5. "사용 설정" 클릭

### 2-3. Firebase 웹 앱 등록

1. Firebase Console 프로젝트 개요 페이지로 이동
2. "웹" 아이콘 (`</>`) 클릭
3. 앱 닉네임 입력 (예: "cancer-tracker-web")
4. "앱 등록" 클릭
5. **Firebase SDK 구성 정보 복사** (다음 단계에서 사용)

구성 정보 예시:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

---

## 3단계: 환경 변수 설정

### 3-1. .env 파일 생성

프로젝트 루트 디렉토리에서:

```bash
cp .env.example .env
```

### 3-2. .env 파일 편집

`.env` 파일을 열고 Firebase 구성 정보를 입력:

```env
REACT_APP_FIREBASE_API_KEY=여기에_apiKey_입력
REACT_APP_FIREBASE_AUTH_DOMAIN=여기에_authDomain_입력
REACT_APP_FIREBASE_PROJECT_ID=여기에_projectId_입력
REACT_APP_FIREBASE_STORAGE_BUCKET=여기에_storageBucket_입력
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=여기에_messagingSenderId_입력
REACT_APP_FIREBASE_APP_ID=여기에_appId_입력
REACT_APP_ANTHROPIC_API_KEY=나중에_입력
```

**주의**: AI 요약 기능을 사용하려면 Anthropic API 키가 필요합니다 (4단계 참조).

---

## 4단계: Anthropic API 키 발급 (선택사항)

AI 요약 기능을 사용하려면:

1. [Anthropic Console](https://console.anthropic.com/)에 접속
2. 계정 생성 또는 로그인
3. "API Keys" 메뉴 선택
4. "Create Key" 클릭
5. API 키 복사
6. `.env` 파일의 `REACT_APP_ANTHROPIC_API_KEY`에 입력

**참고**: Anthropic API는 유료 서비스입니다. 무료 크레딧이 제공될 수 있습니다.

**AI 요약 없이 테스트하려면**: 이 단계를 건너뛰고, AI 요약 기능만 제외하고 다른 기능들을 테스트할 수 있습니다.

---

## 5단계: 개발 서버 실행

```bash
npm start
```

또는 Yarn을 사용하는 경우:
```bash
yarn start
```

브라우저가 자동으로 `http://localhost:3000`에서 열립니다.

---

## 6단계: 기능 테스트

### 1) 사용자 정보 등록 테스트

1. "사용자 정보" 메뉴 클릭
2. 다음 정보 입력:
   - 닉네임: 홍길동
   - 생년월일: 1990-01-01
   - 성별: 남 또는 여 선택
   - 병명: 테스트 병명
   - 기저질환 정보: (선택사항)
3. "등록하기" 클릭
4. 등록 성공 메시지 확인
5. 페이지 새로고침 후 데이터가 유지되는지 확인

### 2) 약물 목록 관리 테스트

1. "약물 관리" 메뉴 클릭
2. "+ 약물 등록하기" 클릭
3. 다음 정보 입력:
   - 약물 이름: 타세바
   - 복용 횟수: 1일 2회
   - 주요 효능: 항암제
   - 기타 내용: (선택사항)
4. "등록하기" 클릭
5. 테이블에 약물이 표시되는지 확인
6. "삭제" 버튼 테스트

### 3) 일일 증상 기록 테스트

1. "증상 캘린더" 메뉴 클릭
2. 캘린더에서 오늘 날짜 클릭
3. "작성하기" 클릭
4. 다음 정보 입력:
   - 날짜: 오늘 날짜
   - 항암 진행 횟수: 1차
   - 항암 회차: 1회차
   - 항암 진행 일차: 1일차
   - 식사량: 50% 정도 섭취
   - 음수량: 1.5L
   - 운동량: 30분 걷기
   - 주요 부작용: 오심, 구토 체크
   - 주요 증상: 메스꺼움이 있었으나 견딜만한 수준
5. "등록하기" 클릭
6. 캘린더에 레드닷과 뱃지가 표시되는지 확인
7. 날짜 다시 클릭하여 저장된 내용 확인
8. "수정하기"로 수정 테스트

**여러 날짜 기록 추가**:
- 다른 날짜도 몇 개 더 기록하여 AI 요약 테스트 준비

### 4) AI 요약 테스트 (API 키 필요)

1. "AI 요약" 메뉴 클릭
2. 항암 진행 횟수 선택 (예: 1차)
3. 항암 회차 선택 (예: 1회차)
4. "AI 요약 생성" 클릭
5. AI가 생성한 요약 확인

**API 키가 없는 경우**: "AI API 키가 설정되지 않았습니다" 메시지가 표시됩니다.

---

## 7단계: Firebase에서 데이터 확인

1. Firebase Console > Firestore Database로 이동
2. 다음 컬렉션 확인:
   - `users`: 사용자 정보
   - `medications`: 약물 목록
   - `symptomRecords`: 증상 기록
3. 각 문서에 입력한 데이터가 저장되어 있는지 확인

---

## 문제 해결

### npm install 실패
```bash
# 캐시 권한 수정
sudo chown -R $(whoami) ~/.npm

# 또는 Yarn 사용
npm install -g yarn
yarn install
```

### Firebase 연결 오류
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 `REACT_APP_`로 시작하는지 확인
- Firebase 프로젝트에서 Firestore가 활성화되어 있는지 확인
- 개발 서버를 재시작 (`Ctrl+C` 후 `npm start`)

### 데이터가 저장되지 않음
- 브라우저 개발자 도구 (F12) > Console 탭에서 에러 확인
- Firebase Firestore 규칙이 테스트 모드인지 확인
- 네트워크 연결 확인

### AI 요약이 작동하지 않음
- Anthropic API 키가 `.env`에 올바르게 입력되었는지 확인
- API 사용량 한도 확인
- 브라우저 개발자 도구 > Network 탭에서 API 호출 상태 확인

### 캘린더가 표시되지 않음
- `npm install` 또는 `yarn install` 재실행
- `react-calendar` 패키지 설치 확인: `npm list react-calendar`

---

## 모바일 테스트

### 반응형 디자인 테스트
1. 브라우저 개발자 도구 (F12) 열기
2. 디바이스 툴바 토글 (Ctrl+Shift+M 또는 Cmd+Shift+M)
3. 다양한 디바이스 크기로 테스트:
   - iPhone SE
   - iPhone 12 Pro
   - iPad
   - Desktop

### 실제 모바일 기기에서 테스트
1. 컴퓨터와 모바일이 같은 Wi-Fi에 연결
2. 터미널에서 컴퓨터 IP 확인:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```
3. 모바일 브라우저에서 `http://[컴퓨터IP]:3000` 접속

---

## 다음 단계

### 프로덕션 배포
- [Vercel](https://vercel.com/) 또는 [Netlify](https://www.netlify.com/) 사용
- README.md의 배포 섹션 참고

### 보안 강화
- Firebase Firestore 규칙 설정
- 사용자 인증 추가 (Firebase Authentication)

### 추가 기능
- 데이터 백업/복원 기능
- PDF 리포트 생성
- 차트/그래프 시각화

---

## 지원

문제가 발생하면:
1. 브라우저 개발자 도구에서 에러 메시지 확인
2. Firebase Console에서 데이터베이스 상태 확인
3. `.env` 파일 설정 재확인
4. 개발 서버 재시작

즐거운 개발 되세요!
