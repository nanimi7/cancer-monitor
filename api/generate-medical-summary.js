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

**중요: 분석 시 주의사항**
- 각 기록의 괄호 안에 있는 사용자의 텍스트 입력(식사 메뉴, 음료 종류, 운동 내용 등)을 반드시 분석에 참고하세요
- 식사량 정보는 "아침:", "점심:", "저녁:", "기타:" 형식으로 구분되어 제공됩니다. 각 시간대별 식사 내용을 종합적으로 분석하세요
- 예: 식사량이 1/4로 줄었더라도 "아침: 죽 반공기, 점심: 미역국, 저녁: 토스트 1개"와 같은 시간대별 메뉴가 있다면 영양소 균형, 섭취 패턴, 식사 빈도를 분석하세요
- 음수량 기록의 괄호 내용(물, 이온음료, 보리차 등)을 확인하여 수분 섭취의 질적 측면도 평가하세요
- 운동량 기록의 괄호 내용(산책, 스트레칭, 실내 걷기 등)을 확인하여 운동 강도와 다양성을 평가하세요

다음 항목별로 분석을 생성해주세요:

1. **식사량 분석**
   - 사용자가 입력한 구체적 메뉴를 바탕으로 영양 상태 평가
   - 전체 기간 동안의 식사량 패턴과 변화 추이
   - 영양소 균형, 섭취 다양성 평가
   - 2-3줄로 간결하게 요약

2. **음수량 분석**
   - 사용자가 입력한 음료 종류를 바탕으로 수분 섭취의 질 평가
   - 전체 기간 동안의 음수량 패턴
   - 권장 수준 대비 평가
   - 2-3줄로 간결하게 요약

3. **운동량 분석**
   - 사용자가 입력한 운동 내용을 바탕으로 활동 패턴 평가
   - 전체 기간 동안의 운동량 추이
   - 치료 중 적절성 평가
   - 2-3줄로 간결하게 요약

4. **배변 상태 분석**
   - 배변 빈도와 상태 패턴
   - 변비나 설사 경향 파악
   - 1-2줄로 간결하게 요약

5. **특이사항 및 부작용**
   - 주요 부작용 패턴과 빈도
   - 시간에 따른 증상 변화 추이
   - 의료진 상담이 필요한 부분
   - 3-4줄로 간결하게 요약

6. **AI 코멘트 (참고용)**
   - 환자의 나이, 진단명을 고려한 전반적 평가
   - 항암치료 과정에서 일반적인 반응인지 안내
   - **반드시 마지막에 따뜻한 이모지(💪, 🌟, 💙 등)와 함께 "잘하고 계십니다. 힘내서 회복에 집중하세요!" 같은 짧고 따뜻한 응원 메시지를 포함할 것**

**응답 형식 (반드시 이 형식을 따라주세요):**
===식사량===
[분석 내용]

===음수량===
[분석 내용]

===운동량===
[분석 내용]

===배변===
[분석 내용]

===특이사항===
[분석 내용]

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
    const foodMatch = responseText.match(/===식사량===\s*([\s\S]*?)\s*(?:===|$)/);
    const waterMatch = responseText.match(/===음수량===\s*([\s\S]*?)\s*(?:===|$)/);
    const exerciseMatch = responseText.match(/===운동량===\s*([\s\S]*?)\s*(?:===|$)/);
    const bowelMatch = responseText.match(/===배변===\s*([\s\S]*?)\s*(?:===|$)/);
    const specialMatch = responseText.match(/===특이사항===\s*([\s\S]*?)\s*(?:===|$)/);
    const commentMatch = responseText.match(/===AI코멘트===\s*([\s\S]*)/);

    const food = foodMatch ? foodMatch[1].trim() : '분석을 생성할 수 없습니다.';
    const water = waterMatch ? waterMatch[1].trim() : '분석을 생성할 수 없습니다.';
    const exercise = exerciseMatch ? exerciseMatch[1].trim() : '분석을 생성할 수 없습니다.';
    const bowel = bowelMatch ? bowelMatch[1].trim() : '분석을 생성할 수 없습니다.';
    const special = specialMatch ? specialMatch[1].trim() : '분석을 생성할 수 없습니다.';
    const comment = commentMatch ? commentMatch[1].trim() : '코멘트를 생성할 수 없습니다.';

    return res.status(200).json({
      food,
      water,
      exercise,
      bowel,
      special,
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
