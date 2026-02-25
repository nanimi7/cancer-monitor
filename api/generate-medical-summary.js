import Anthropic from '@anthropic-ai/sdk';
import { applyCors, enforceBodySize, verifyUser } from './_lib/security.js';

// ============================================================
// 상수 정의
// ============================================================

const MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 1500;
const MAX_LINES = 3;
const MAX_LINES_CURRENT = 2;  // 비교 데이터 있을 때 현재 분석
const MAX_LINES_COMPARE = 1;  // 비교 데이터 있을 때 비교 분석
const MAX_LINES_COMMENT = 4;  // AI 종합 코멘트

const DEFAULT_ERROR_MESSAGE = '분석을 생성할 수 없습니다.';
const DEFAULT_COMMENT_ERROR = '코멘트를 생성할 수 없습니다.';

const GENDER_MAP = {
  male: '남성',
  female: '여성',
};

const SECTION_KEYS = ['식사량', '음수량', '운동량', '배변', '특이사항', 'AI코멘트'];

// 분석 항목 - 3줄 제한에 맞게 핵심만 요청
const ANALYSIS_ITEMS = [
  { title: '식사량', focus: '영양 상태와 식사 패턴', includeComparison: true },
  { title: '음수량', focus: '수분 섭취 적절성', includeComparison: true },
  { title: '운동량', focus: '활동량과 치료 중 적절성', includeComparison: true },
  { title: '배변', focus: '배변 패턴과 이상 여부', includeComparison: true },
  { title: '특이사항', focus: '주요 부작용과 주의사항', includeComparison: true },
  { title: 'AI코멘트', focus: '전반적 평가와 응원', includeComparison: false },
];

// ============================================================
// 유틸리티 함수
// ============================================================

function formatGender(gender) {
  return GENDER_MAP[gender] || '정보 없음';
}

function formatAge(age) {
  return age ? `${age}세` : '정보 없음';
}

function formatSessionLabel(sessionInfo) {
  if (!sessionInfo) return '';
  return `${sessionInfo.cycle} ${sessionInfo.session}`;
}

function parseAIResponse(responseText) {
  const results = {};

  SECTION_KEYS.forEach((key, index) => {
    const isLast = index === SECTION_KEYS.length - 1;
    const pattern = isLast
      ? new RegExp(`===${key}===\\s*([\\s\\S]*)`)
      : new RegExp(`===${key}===\\s*([\\s\\S]*?)\\s*(?:===|$)`);

    const match = responseText.match(pattern);
    results[key] = match ? match[1].trim() : null;
  });

  return {
    food: results['식사량'] || DEFAULT_ERROR_MESSAGE,
    water: results['음수량'] || DEFAULT_ERROR_MESSAGE,
    exercise: results['운동량'] || DEFAULT_ERROR_MESSAGE,
    bowel: results['배변'] || DEFAULT_ERROR_MESSAGE,
    special: results['특이사항'] || DEFAULT_ERROR_MESSAGE,
    comment: results['AI코멘트'] || DEFAULT_COMMENT_ERROR,
  };
}

// ============================================================
// 프롬프트 빌더
// ============================================================

function buildPrompt({ userProfile, symptomTexts, recordCount, currentSessionInfo, previousSessionInfo, previousSymptomTexts }) {
  const hasPreviousData = Boolean(previousSessionInfo && previousSymptomTexts);
  const currentLabel = formatSessionLabel(currentSessionInfo);
  const previousLabel = formatSessionLabel(previousSessionInfo);

  // 환자 정보 섹션
  const patientInfo = `**환자:** ${formatAge(userProfile.age)}, ${formatGender(userProfile.gender)}, ${userProfile.disease || '진단명 미입력'}`;

  // 이전 비교가 없을 때 프롬프트
  if (!hasPreviousData) {
    return `의료진에게 환자의 항암치료 경과를 간결하게 전달하세요.

${patientInfo}

**현재 기록 (${currentLabel}, ${recordCount}건):**
${symptomTexts}

**작성 규칙:**
- 식사량~특이사항: 각 항목 최대 ${MAX_LINES}줄, 핵심만 간결하게
- AI코멘트: 최대 ${MAX_LINES_COMMENT}줄

**AI코멘트 작성 규칙:**
- 환자의 진단명, 나이, 현재 항암 진행 횟수를 고려
- 이번 회차의 식사/음수/운동/배변/부작용 추이를 종합 분석
- 현재 전반적인 컨디션 상태를 객관적으로 평가
- 마지막 문장은 반드시 환자를 격려하는 응원 문구로 마무리 (이모지 포함)

**응답 형식:**
===식사량===
[현재 상태 분석]

===음수량===
[현재 상태 분석]

===운동량===
[현재 상태 분석]

===배변===
[현재 상태 분석]

===특이사항===
[현재 상태 분석]

===AI코멘트===
[${MAX_LINES_COMMENT}줄: 종합 상태 평가 + 마지막에 응원 문구]`;
  }

  // 이전 비교가 있을 때 프롬프트 (더 구체적인 지시)
  return `의료진에게 환자의 항암치료 경과를 간결하게 전달하세요.

${patientInfo}

**현재 기록 (${currentLabel}, ${recordCount}건):**
${symptomTexts}

**직전 회차 기록 (${previousLabel}):**
${previousSymptomTexts}

**중요 규칙:**
1. 식사량, 음수량, 운동량, 배변, 특이사항 - 이 5개 항목 모두 반드시 이전 비교 포함 (각 ${MAX_LINES}줄)
2. AI코멘트는 종합 분석 (${MAX_LINES_COMMENT}줄)

**비교 작성 형식 (5개 항목 모두 동일하게):**
- 1~2줄: 현재 상태 분석
- 마지막 줄: "📊 이전 비교:" 로 시작하여 "이전엔 ~였는데 지금은 ~. [주목할 점]" 형태로 작성

**AI코멘트 작성 규칙:**
- 환자의 진단명(${userProfile.disease || '미입력'}), 나이(${formatAge(userProfile.age)}), 현재 항암 진행(${currentLabel})을 고려
- 이번 회차와 직전 회차(${previousLabel}) 비교하여 전반적인 변화 추이 분석
- 식사/음수/운동/배변/부작용을 종합하여 현재 컨디션 객관적 평가
- 마지막 문장은 반드시 환자를 격려하는 응원 문구로 마무리 (이모지 포함)

**응답 형식:**
===식사량===
[현재 분석 1~2줄]
📊 이전 비교: 이전엔 ~였는데 지금은 ~. [주목할 점]

===음수량===
[현재 분석 1~2줄]
📊 이전 비교: 이전엔 ~였는데 지금은 ~. [주목할 점]

===운동량===
[현재 분석 1~2줄]
📊 이전 비교: 이전엔 ~였는데 지금은 ~. [주목할 점]

===배변===
[현재 분석 1~2줄]
📊 이전 비교: 이전엔 ~였는데 지금은 ~. [주목할 점]

===특이사항===
[현재 분석 1~2줄]
📊 이전 비교: 이전엔 ~였는데 지금은 ~. [주목할 점]

===AI코멘트===
[${MAX_LINES_COMMENT}줄: 종합 상태 평가 (직전 회차 대비 변화 포함) + 마지막에 응원 문구]`;
}

// ============================================================
// API 클라이언트
// ============================================================

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in environment variables');
    return null;
  }

  return new Anthropic({ apiKey });
}

async function callClaudeAPI(client, prompt) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

// ============================================================
// 핸들러
// ============================================================

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await verifyUser(req);
    enforceBodySize(req);

    const { userProfile, symptomTexts, recordCount, currentSessionInfo, previousSessionInfo, previousSymptomTexts } = req.body;

    if (!userProfile || !symptomTexts) {
      return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    const client = getAnthropicClient();
    if (!client) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const prompt = buildPrompt({
      userProfile,
      symptomTexts,
      recordCount,
      currentSessionInfo,
      previousSessionInfo,
      previousSymptomTexts,
    });

    const responseText = await callClaudeAPI(client, prompt);
    const result = parseAIResponse(responseText);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Claude API 호출 오류:', error);
    return res.status(error.statusCode || 500).json({
      error: 'AI 요약 생성 중 오류가 발생했습니다.',
      details: error.statusCode ? `${error.statusCode}: ${error.message}` : error.message,
    });
  }
}
