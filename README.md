# 항암치료 기록 웹 서비스

항암치료 과정을 체계적으로 기록하고 AI를 활용하여 증상을 요약해주는 웹 서비스입니다.

## 주요 기능

### 1. 사용자 정보 등록
- 닉네임, 생년월일, 성별, 병명, 기저질환 정보 등록
- 입력 검증 및 유효성 검사
- 정보 수정 기능

### 2. 처방받은 약 목록 관리
- 약물 정보 등록 (약물 이름, 복용 횟수, 주요 효능, 기타 내용)
- 등록된 약물 목록 조회 (테이블 형식)
- 약물 삭제 기능

### 3. 일일 증상 기록 캘린더
- 월간 캘린더 형식으로 증상 기록
- 날짜별 상세 정보 입력
  - 항암 진행 횟수, 회차, 일차
  - 식사량, 음수량, 운동량
  - 주요 부작용 (구토, 오심, 발열, 손발저림, 두통, 설사, 변비)
  - 주요 증상
- 기록된 날짜 표시 (레드닷, 뱃지)
- 기록 조회 및 수정

### 4. AI 요약
- 항암 회차별 증상 요약
- Claude API를 활용한 자동 분석
- 의료진 전달용 요약 정보 제공

## 기술 스택

- **Frontend**: React 18
- **Backend**: Firebase Firestore
- **AI**: Anthropic Claude API
- **UI Components**: react-calendar
- **Date Handling**: date-fns

## 설치 및 실행 방법

### 1. 프로젝트 클론 및 의존성 설치

```bash
cd 항암치료추적기
npm install
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Firestore Database 활성화
3. 프로젝트 설정에서 Firebase 구성 정보 확인
4. `.env` 파일 생성 (`.env.example` 참고)

```bash
cp .env.example .env
```

5. `.env` 파일에 Firebase 설정 정보 입력

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Firestore 데이터베이스 규칙 설정

Firebase Console에서 Firestore Database > 규칙으로 이동하여 다음 규칙 적용:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

위 규칙은 사용자별 데이터 격리를 강제합니다.

### 4. Anthropic API 키 발급

1. [Anthropic Console](https://console.anthropic.com/)에서 계정 생성
2. API Keys 메뉴에서 새 API 키 생성
3. 서버 환경 변수에 `ANTHROPIC_API_KEY`로 입력

### 5. 개발 서버 실행

```bash
npm start
```

브라우저에서 `http://localhost:3000` 접속

### 6. 프로덕션 빌드

```bash
npm run build
```

## 데이터 구조

### users (사용자 정보)
```javascript
{
  nickname: string,
  birthdate: string,
  gender: string,
  disease: string,
  underlyingConditions: string
}
```

### medications (약물 정보)
```javascript
{
  name: string,
  frequency: string,
  effect: string,
  notes: string
}
```

### symptomRecords (증상 기록)
```javascript
{
  date: string,
  chemoCycle: string,
  chemoSession: string,
  chemoDay: string,
  foodIntake: string,
  waterIntake: string,
  exercise: string,
  sideEffects: array,
  symptoms: string
}
```

## 배포

### Vercel 배포

1. [Vercel](https://vercel.com/)에 계정 생성
2. GitHub 저장소 연결
3. 환경 변수 설정 (`.env` 내용)
4. 배포

### Netlify 배포

1. [Netlify](https://www.netlify.com/)에 계정 생성
2. `build` 폴더 업로드 또는 GitHub 연결
3. 환경 변수 설정
4. 배포

## 보안 고려사항

1. **데이터 암호화**: Firebase의 기본 암호화 활용
2. **환경 변수**: API 키는 절대 코드에 하드코딩하지 않음
3. **Firestore 규칙**: 프로덕션에서는 적절한 인증 및 권한 설정 필요
4. **HTTPS**: 프로덕션 환경에서는 HTTPS 사용 필수

## 모바일 최적화

- 반응형 디자인 적용
- 터치 친화적 UI
- 모바일 화면 크기 대응

## 문제 해결

### Firebase 연결 오류
- `.env` 파일의 Firebase 설정 확인
- Firebase 프로젝트에서 Firestore 활성화 확인

### AI 요약 생성 실패
- Anthropic API 키 확인
- API 사용량 및 요금제 확인
- 네트워크 연결 확인

### 캘린더 표시 오류
- `react-calendar`와 `date-fns` 패키지 설치 확인
- 브라우저 캐시 삭제

## 라이선스

이 프로젝트는 개인 사용 목적으로 제작되었습니다.

## 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.

## 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
