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
    const { userProfile, symptomTexts, recordCount, currentSessionInfo, previousSessionInfo, previousSymptomTexts } = req.body;

    if (!userProfile || !symptomTexts) {
      return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    const hasPreviousData = previousSessionInfo && previousSymptomTexts;

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // 이전 차수 비교 데이터가 있는 경우와 없는 경우 프롬프트 분기
    const comparisonSection = hasPreviousData ? `
**이전 차수 기록 (${previousSessionInfo.cycle} ${previousSessionInfo.session}):**
${previousSymptomTexts}

**분석 방식:**
- 각 항목은 반드시 **줄바꿈 포함 총 10줄 이내**로 작성
- **현재 차수(${currentSessionInfo.cycle} ${currentSessionInfo.session}) 분석: 5줄**
- **이전 차수(${previousSessionInfo.cycle} ${previousSessionInfo.session})와 비교 분석: 5줄**
- 비교 분석은 "vs 이전:" 또는 "[비교]" 등으로 명확히 구분` : `
**분석 방식:**
- 비교할 이전 차수 데이터가 없습니다
- 각 항목은 반드시 **줄바꿈 포함 총 10줄 이내**로 현재 차수만 분석`;

    const prompt = `당신은 의료진에게 환자의 항암치료 경과를 전달하는 의료 보조 AI입니다.

**환자 정보:**
- 나이: ${userProfile.age ? `${userProfile.age}세` : '정보 없음'}
- 성별: ${userProfile.gender === 'male' ? '남성' : userProfile.gender === 'female' ? '여성' : '정보 없음'}
- 진단명: ${userProfile.disease || '정보 없음'}
- 최초 진단일: ${userProfile.diagnosisDate || '정보 없음'}

**현재 차수 기록 (${currentSessionInfo?.cycle || ''} ${currentSessionInfo?.session || ''}, ${recordCount}건):**
${symptomTexts}
${comparisonSection}

**핵심 규칙: 모든 항목은 줄바꿈 포함 반드시 10줄 이내로 작성하세요. 이 규칙은 절대적입니다.**

다음 항목별로 분석을 생성해주세요:

1. **식사량 분석** (10줄 이내)
   - 구체적 메뉴 기반 영양 상태 평가
   - 단백질, 탄수화물 등 영양소 균형
   ${hasPreviousData ? '- 이전 차수 대비 변화 분석' : ''}

2. **음수량 분석** (10줄 이내)
   - 수분 섭취량 및 음료 종류 평가
   - 권장 수준 대비 평가
   ${hasPreviousData ? '- 이전 차수 대비 변화 분석' : ''}

3. **운동량 분석** (10줄 이내)
   - 활동 패턴 및 운동 강도 평가
   - 치료 중 적절성 평가
   ${hasPreviousData ? '- 이전 차수 대비 변화 분석' : ''}

4. **배변 상태 분석** (10줄 이내)
   - 배변 빈도와 상태 패턴
   ${hasPreviousData ? '- 이전 차수 대비 변화 분석' : ''}

5. **특이사항 및 부작용** (10줄 이내)
   - 주요 부작용 패턴과 빈도
   - 의료진 상담 필요 여부
   ${hasPreviousData ? '- 이전 차수 대비 변화 분석' : ''}

6. **AI 코멘트** (10줄 이내)
   - 전반적 평가와 짧은 응원 메시지 (이모지 포함)

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
