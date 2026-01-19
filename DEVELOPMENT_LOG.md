# 항암치료 추적기 개발 로그

## 2026-01-16 작업 내용

### 1. 체크박스/라디오 버튼 간격 및 정렬 개선 ✅ (배포 완료)
**문제:** 체크박스와 텍스트가 너무 바짝 붙어있고 수직 정렬이 잘 안됨

**해결:**
- 체크박스와 텍스트 간격: 6px (PC), 5px (모바일)
- 라디오 버튼 간 간격: 16px (PC), 14px (모바일)
- 체크박스 크기 명시: 18x18px (PC), 16x16px (모바일)
- align-items: center로 수직 중앙 정렬
- flex-shrink: 0으로 크기 고정

**파일:**
- `src/styles/DailySymptomCalendar.css`

---

### 2. 증상 기록 조회 화면 레이아웃 개선 ✅ (배포 완료)
**변경사항:**
- 항목 타이틀과 값을 한 줄에 표시 (예: "항암 진행 횟수: 1차")
- 메모(선택사항)는 다음 줄에 표시 유지
- 주요 증상은 별도 줄에 표시 (긴 텍스트)

**파일:**
- `src/components/DailySymptomCalendar.js` (line 423)
- `src/styles/DailySymptomCalendar.css` (line 308-312)

**CSS 변경:**
```css
.record-item strong {
  display: inline; /* block에서 inline으로 변경 */
  margin-right: 4px;
}
```

---

### 3. 항암/방사선 치료 통합 관리 기능 구현 ⚠️ (테스트 환경 - 미배포)
**기획:** 옵션 1 + 옵션 3 조합
- 현재 캘린더에 치료 유형 선택 추가
- 사용자 정보에 치료 계획 섹션 추가

#### 3-1. UserProfile 수정
**파일:** `src/components/UserProfile.js`

**추가된 필드:**
```javascript
{
  treatmentTypes: [], // ['chemo', 'radiation']
  chemoStartDate: '',
  radiationStartDate: ''
}
```

**UI 추가:**
- 치료 계획 섹션 (line 308-361)
- 치료 유형 체크박스 (항암치료, 방사선치료)
- 각 치료별 시작일 입력 필드 (조건부 표시)

**CSS:** `src/styles/UserProfile.css` (line 188-233)
- `.treatment-plan-section` 스타일
- `.section-description` 스타일
- `.checkbox-group`, `.checkbox-label` 스타일

#### 3-2. DailySymptomCalendar 대폭 수정
**파일:** `src/components/DailySymptomCalendar.js`

**데이터 구조 변경:**
```javascript
{
  date: '',
  treatmentTypes: [], // ['chemo', 'radiation']

  // 항암 관련
  chemoCycle: '',
  chemoSession: '',
  chemoDay: '',

  // 방사선 관련
  radiationCycle: '',
  radiationSession: '',
  radiationSite: '',

  // 공통 필드
  foodIntakeLevel: '',
  // ...
}
```

**부작용 옵션 (치료 유형별):**
```javascript
// 항암 부작용
const chemoSideEffectOptions = [
  '없음', '구토', '오심', '발열', '손발저림', '두통',
  '설사', '변비', '탈모', '발진', '가려움', '근육통',
  '백혈구감소', '빈혈'
];

// 방사선 부작용
const radiationSideEffectOptions = [
  '없음', '피부홍반', '피부건조', '부종', '피로',
  '점막염', '구강건조', '삼킴곤란', '식욕부진',
  '오심', '설사', '방광염'
];
```

**방사선 치료 옵션:**
```javascript
// 방사선 진행 횟수
radiationCycleOptions = [
  { value: '1차', label: '1차' },
  { value: '2차', label: '2차' },
  { value: '3차', label: '3차' }
];

// 방사선 회차 (1~30회차)
radiationSessionOptions = Array.from({ length: 30 }, (_, i) => ({
  value: `${i + 1}회차`,
  label: `${i + 1}회차`
}));

// 조사 부위
radiationSiteOptions = [
  { value: '두경부', label: '두경부' },
  { value: '흉부', label: '흉부' },
  { value: '복부', label: '복부' },
  { value: '골반', label: '골반' },
  { value: '사지', label: '사지' },
  { value: '기타', label: '기타' }
];
```

**동적 부작용 옵션 함수 (line 115-130):**
```javascript
const getSideEffectOptions = () => {
  const hasChemo = formData.treatmentTypes.includes('chemo');
  const hasRadiation = formData.treatmentTypes.includes('radiation');

  if (hasChemo && hasRadiation) {
    // 병행 치료: 모든 옵션 표시 (중복 제거)
    const combined = [...new Set([...chemoSideEffectOptions, ...radiationSideEffectOptions])];
    return combined.sort();
  } else if (hasChemo) {
    return chemoSideEffectOptions;
  } else if (hasRadiation) {
    return radiationSideEffectOptions;
  }
  return chemoSideEffectOptions; // 기본값
};
```

**폼 UI 변경 (line 519-648):**
1. 치료 유형 선택 (체크박스)
2. 항암치료 필드 (조건부 표시 - line 546-595)
   - 항암 진행 횟수
   - 항암 회차
   - 항암 진행 일차
3. 방사선치료 필드 (조건부 표시 - line 598-648)
   - 방사선 진행 횟수
   - 방사선 회차
   - 조사 부위

**검증 로직 (line 269-308):**
```javascript
// 치료 유형 필수
if (formData.treatmentTypes.length === 0) {
  newErrors.treatmentTypes = '치료 유형을 하나 이상 선택해주세요.';
}

// 항암 치료 선택 시 필수 항목
if (formData.treatmentTypes.includes('chemo')) {
  if (!formData.chemoCycle) { /* ... */ }
  // ...
}

// 방사선 치료 선택 시 필수 항목
if (formData.treatmentTypes.includes('radiation')) {
  if (!formData.radiationCycle) { /* ... */ }
  // ...
}
```

**기록 조회 UI (line 459-508):**
- 치료 유형 표시
- 선택한 치료에 따라 관련 정보만 표시
- 레거시 데이터 지원 (treatmentTypes 없는 기존 데이터)

**BottomSheet 추가 (line 925-965):**
- radiationCycle
- radiationSession
- radiationSite

---

## 주요 기능

### 완료된 기능 (상용 배포 완료)
1. ✅ Bottom Sheet UI 구현 (모바일 친화적)
2. ✅ 드롭다운 변환 (항암 진행 횟수, 회차, 일차)
3. ✅ 식사량 표시 개선 (퍼센트 → 텍스트)
4. ✅ '없음' 선택 시 다른 부작용 자동 비활성화
5. ✅ 폼 필드 높이 축소 (약 75% 감소)
6. ✅ 메뉴명 변경 ("증상 캘린더" → "항암증상캘린더")
7. ✅ 페이지 제목 변경 ("일일 증상 기록 캘린더" → "일일 항암 증상 기록 캘린더")
8. ✅ 체크박스/라디오 버튼 간격 및 정렬 최적화
9. ✅ 증상 기록 조회 화면 레이아웃 개선

### 테스트 환경에만 있는 기능 (미배포)
10. ⚠️ 항암/방사선 치료 통합 관리
    - 사용자 정보에 치료 계획 설정
    - 증상 캘린더에서 치료 유형 선택
    - 치료 유형에 따른 동적 필드 표시
    - 치료 유형별 부작용 옵션

---

## 다음 작업 예정 사항

### 미완료 항목
- [ ] 캘린더 배지 색상으로 치료 유형 구분
  - 항암: 기존 색상 유지
  - 방사선: 주황/오렌지 계열
  - 병행: 보라/퍼플 계열

### 추가 고려사항
1. AI 요약 기능에서 치료별 분석 추가
2. 타임라인 뷰 추가 (선택사항)
3. 치료 일정 자동 계산 기능 (선택사항)

---

## Git 커밋 내역

### 배포된 커밋
1. `bff6432` - 개선: 증상 캘린더 UI/UX 대폭 향상 및 명칭 변경
2. `5a70145` - 수정: ESLint 경고 해결로 CI 빌드 통과
3. `44571b2` - 개선: 체크박스/라디오 버튼 간격 및 정렬 최적화
4. `ce0ea9a` - 개선: 증상 기록 조회 화면 레이아웃 개선

### 미배포 작업
- 항암/방사선 치료 통합 관리 기능 (로컬 테스트 환경에만 존재)

---

## 테스트 방법

### 로컬 테스트 환경
```bash
cd /Users/very.choi/Desktop/PAS/cancer-monitor
npm start
# http://localhost:3000 접속
```

### 테스트 시나리오
1. **사용자 정보**
   - 치료 계획에서 항암치료/방사선치료 선택
   - 시작일 입력 (선택사항)

2. **증상 캘린더**
   - 날짜 선택 후 "기록하기" 클릭
   - 치료 유형 선택 (항암/방사선/둘 다)
   - 선택한 치료에 맞는 필드가 표시되는지 확인
   - 부작용 옵션이 치료 유형에 따라 변경되는지 확인
   - 저장 후 조회 화면에서 올바르게 표시되는지 확인

---

## 파일 변경 요약

### 배포된 파일
- `src/App.js` - 메뉴명 변경
- `src/components/DailySymptomCalendar.js` - UI/UX 개선
- `src/styles/DailySymptomCalendar.css` - 스타일 개선
- `src/components/BottomSheet.js` - 새로 생성
- `src/styles/BottomSheet.css` - 새로 생성

### 미배포 파일 (로컬에만 존재)
- `src/components/UserProfile.js` - 치료 계획 섹션 추가
- `src/styles/UserProfile.css` - 치료 계획 스타일 추가
- `src/components/DailySymptomCalendar.js` - 치료 유형 통합 관리

---

## 주의사항

### 레거시 데이터 호환성
- 기존 데이터 (treatmentTypes 필드 없음)도 정상 표시되도록 처리됨
- 조회 화면에서 treatmentTypes가 없으면 기존 항암 데이터로 간주

### ESLint 경고
- 일부 useEffect 의존성 경고는 의도적으로 무시 (eslint-disable-next-line)
- 프로덕션 빌드 시 문제없음

---

## 문의사항
- 항암/방사선 통합 기능 테스트 후 피드백 필요
- 캘린더 배지 색상 구분 구현 여부 결정 필요
