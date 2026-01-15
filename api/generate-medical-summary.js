import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userProfile, symptomTexts, recordCount } = req.body;

    if (!userProfile || !symptomTexts) {
      return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = `당신은 의료진에게 환자의 항암치료 경과를 전달하는 의료 보조 AI입니다.

**환자 정보:**
- 나이: ${userProfile.age ? `${userProfile.age}세` : '정보 없음'}
- 성별: ${userProfile.gender === 'male' ? '남성' : userProfile.gender === 'female' ? '여성' : '정보 없음'}
- 진단명: ${userProfile.disease || '정보 없음'}
- 최초 진단일: ${userProfile.diagnosisDate || '정보 없음'}

**증상 기록 (최근 ${recordCount}건):**
${symptomTexts}

다음 두 가지를 생성해주세요:

1. **의료진 전달 주요 증상 요약 (10줄 이내)**
   - 반드시 "- " (하이픈 + 공백)으로 시작하는 불릿 포인트 사용
   - 각 항목은 독립된 줄로 작성 (줄바꿈 적극 활용)
   - 핵심 증상과 변화 추이만 간결하게 정리
   - 주의 필요 증상, 악화/개선 추세를 명확히 표현
   - 식사량, 음수량, 배변, 부작용 패턴 포함

   예시 형식:
   - 식사량: 전반적으로 평소의 50% 수준 유지
   - 음수량: 1500ml 전후로 안정적
   - 주요 부작용: 오심, 피로감 반복 발생
   - 특이사항: 3일차 이후 증상 완화 추세

2. **AI 코멘트 (참고용)**
   - 환자의 나이, 진단명, 증상을 고려한 간결한 참고 의견
   - 항암치료 과정에서 일반적인 반응인지 짧게 안내
   - 의료진 상의가 필요한 부분만 언급 ("의료진과 상의", "확인 필요" 등 중립적 표현 사용)
   - 불필요한 중복 문장 제거, 핵심만 남길 것
   - **반드시 마지막에는 빈 줄을 넣고, 따뜻한 이모지(💪, 🌟, 💙 등)와 함께 "잘하고 계십니다. 힘내서 회복에 집중하세요!" 같은 짧고 따뜻한 응원 메시지를 포함할 것**

**응답 형식 (반드시 이 형식을 따라주세요):**
===주요증상요약===
[10줄 이내의 요약 내용]

===AI코멘트===
[AI 코멘트 내용]`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].text;

    // 응답을 파싱
    const summaryMatch = responseText.match(/===주요증상요약===\s*([\s\S]*?)\s*===AI코멘트===/);
    const commentMatch = responseText.match(/===AI코멘트===\s*([\s\S]*)/);

    const summary = summaryMatch ? summaryMatch[1].trim() : '요약을 생성할 수 없습니다.';
    const comment = commentMatch ? commentMatch[1].trim() : '코멘트를 생성할 수 없습니다.';

    return res.status(200).json({
      summary,
      comment,
    });
  } catch (error) {
    console.error('Claude API 호출 오류:', error);
    return res.status(500).json({
      error: 'AI 요약 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}
