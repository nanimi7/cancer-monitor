import Anthropic from '@anthropic-ai/sdk';
import { applyCors, enforceBodySize, verifyUser } from './_lib/security.js';

// ============================================================
// 상수 정의
// ============================================================

const MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 2000;
const DEFAULT_ERROR_MESSAGE = '분석을 생성할 수 없습니다.';
const DEFAULT_COMMENT_ERROR = '코멘트를 생성할 수 없습니다.';

const GENDER_MAP = {
  male: '남성',
  female: '여성',
};

const SECTION_KEYS = ['식사량', '음수량', '운동량', '배변', '특이사항', 'AI코멘트'];

const ANALYSIS_ITEMS = [
  {
    title: '식사량 분석',
    instructions: ['구체적 메뉴 기반 영양 상태 평가', '단백질, 탄수화물 등 영양소 균형'],
    includeComparison: true,
  },
  {
    title: '음수량 분석',
    instructions: ['수분 섭취량 및 음료 종류 평가', '권장 수준 대비 평가'],
    includeComparison: true,
  },
  {
    title: '운동량 분석',
    instructions: ['활동 패턴 및 운동 강도 평가', '치료 중 적절성 평가'],
    includeComparison: true,
  },
  {
    title: '배변 상태 분석',
    instructions: ['배변 빈도와 상태 패턴'],
    includeComparison: true,
  },
  {
    title: '특이사항 및 부작용',
    instructions: ['주요 부작용 패턴과 빈도', '의료진 상담 필요 여부'],
    includeComparison: true,
  },
  {
    title: 'AI 코멘트',
    instructions: ['전반적 평가와 짧은 응원 메시지 (이모지 포함)'],
    includeComparison: false,
  },
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

function buildComparisonSection(hasPreviousData, currentSessionInfo, previousSessionInfo, previousSymptomTexts) {
  if (!hasPreviousData) {
    return `
**분석 방식:**
- 비교할 이전 차수 데이터가 없습니다
- 각 항목은 반드시 **줄바꿈 포함 총 10줄 이내**로 현재 차수만 분석`;
  }

  const currentLabel = formatSessionLabel(currentSessionInfo);
  const previousLabel = formatSessionLabel(previousSessionInfo);

  return `
**이전 차수 기록 (${previousLabel}):**
${previousSymptomTexts}

**분석 방식:**
- 각 항목은 반드시 **줄바꿈 포함 총 10줄 이내**로 작성
- **현재 차수(${currentLabel}) 분석: 5줄**
- **이전 차수(${previousLabel})와 비교 분석: 5줄**
- 중요: 현재 분석 작성 후, 반드시 빈 줄을 넣고 "📊 이전 비교:" 헤더를 단독 줄로 작성한 뒤 비교 내용을 작성
- 예시 형식:
  현재 분석 내용...

  📊 이전 비교:
  비교 분석 내용...`;
}

function buildAnalysisInstructions(hasPreviousData) {
  return ANALYSIS_ITEMS.map((item, index) => {
    const instructions = item.instructions.map(inst => `   - ${inst}`).join('\n');
    const comparison = (hasPreviousData && item.includeComparison)
      ? '\n   - 이전 차수 대비 변화 분석'
      : '';

    return `${index + 1}. **${item.title}** (10줄 이내)\n${instructions}${comparison}`;
  }).join('\n\n');
}

function buildPrompt({ userProfile, symptomTexts, recordCount, currentSessionInfo, previousSessionInfo, previousSymptomTexts }) {
  const hasPreviousData = Boolean(previousSessionInfo && previousSymptomTexts);
  const currentLabel = formatSessionLabel(currentSessionInfo);
  const comparisonSection = buildComparisonSection(hasPreviousData, currentSessionInfo, previousSessionInfo, previousSymptomTexts);
  const analysisInstructions = buildAnalysisInstructions(hasPreviousData);

  return `당신은 의료진에게 환자의 항암치료 경과를 전달하는 의료 보조 AI입니다.

**환자 정보:**
- 나이: ${formatAge(userProfile.age)}
- 성별: ${formatGender(userProfile.gender)}
- 진단명: ${userProfile.disease || '정보 없음'}
- 최초 진단일: ${userProfile.diagnosisDate || '정보 없음'}

**현재 차수 기록 (${currentLabel}, ${recordCount}건):**
${symptomTexts}
${comparisonSection}

**핵심 규칙: 모든 항목은 줄바꿈 포함 반드시 10줄 이내로 작성하세요. 이 규칙은 절대적입니다.**

다음 항목별로 분석을 생성해주세요:

${analysisInstructions}

**응답 형식 (반드시 이 형식을 따라주세요):**
===식사량===
[분석 내용 - 10줄 이내]

===음수량===
[분석 내용 - 10줄 이내]

===운동량===
[분석 내용 - 10줄 이내]

===배변===
[분석 내용 - 10줄 이내]

===특이사항===
[분석 내용 - 10줄 이내]

===AI코멘트===
[AI 코멘트 - 10줄 이내]`;
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
