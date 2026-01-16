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
    const { records, foodLabelMap, waterLabelMap, exerciseLabelMap } = req.body;

    if (!records || records.length === 0) {
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

    // 데이터 요약 (라벨 및 사용자 입력 텍스트 포함)
    const dataText = records.map((r, idx) => {
      const foodLabel = foodLabelMap[r.foodIntakeLevel] || '미기록';
      const waterLabel = waterLabelMap[r.waterIntakeAmount] || '미기록';
      const exerciseLabel = exerciseLabelMap[r.exerciseTime] || '미기록';

      const foodNote = r.foodIntakeNote ? ` (${r.foodIntakeNote})` : '';
      const waterNote = r.waterIntakeNote ? ` (${r.waterIntakeNote})` : '';
      const exerciseNote = r.exerciseNote ? ` (${r.exerciseNote})` : '';

      return `${idx + 1}일차: 식사[${foodLabel}${foodNote}], 음수[${waterLabel}${waterNote}], 운동[${exerciseLabel}${exerciseNote}], 부작용[${r.sideEffects?.join(', ')}]`;
    }).join('\n');

    const prompt = `다음은 항암치료 환자의 일별 기록입니다:

${dataText}

**중요: 분석 시 주의사항**
- 각 기록의 괄호 안에 있는 사용자의 텍스트 입력(식사 메뉴, 음료 종류, 운동 내용 등)을 반드시 분석에 참고하세요
- 예: 식사량 선택값뿐 아니라 괄호 안의 구체적 메뉴(죽, 미역국, 토스트 등)를 보고 영양소 균형을 평가하세요
- 음수량 괄호 내용(물, 이온음료, 보리차 등)을 확인하여 수분 섭취의 질을 평가하세요
- 운동량 괄호 내용(산책, 스트레칭 등)을 확인하여 운동 패턴의 적절성을 평가하세요

**요청사항:**
위 데이터를 분석하여 각 항목별로 빈도 기반 추이와 더불어 사용자가 입력한 구체적 내용의 질적 분석을 함께 제공해주세요.

다음 형식으로 정확히 응답해주세요:
===식사량===
📊 식사량 분석 (총 ${records.length}일)

• [라벨]: [빈도]일
• [라벨]: [빈도]일
(빈도 순으로 정렬)

➡️ [전체 추세 평가]
[의료진 상담 필요 여부]

===음수량===
💧 음수량 분석 (총 ${records.length}일)

• [라벨]: [빈도]일
• [라벨]: [빈도]일
(빈도 순으로 정렬)

➡️ [전체 추세 평가]
[의료진 상담 필요 여부]

===운동량===
🚶 운동량 분석 (총 ${records.length}일)

• [라벨]: [빈도]일
• [라벨]: [빈도]일
(빈도 순으로 정렬)

➡️ [전체 추세 평가]
[의료진 상담 필요 여부]

===부작용===
⚠️ 부작용 분석 (총 ${records.length}일)

• [부작용명]: [빈도]회
• [부작용명]: [빈도]회
(상위 5개만, 빈도 순으로 정렬)

➡️ [전체 추세 평가]
[의료진 상담 필요 여부]

**주의사항:**
- 빈도가 높은 순서대로 나열
- 각 평가는 한 줄로 간결하게
- 이모지와 불릿 포인트(•) 사용
- 이스케이프 문자 사용 금지`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;

    // 응답 파싱
    const foodMatch = responseText.match(/===식사량===\s*([\s\S]*?)\s*(?:===|$)/);
    const waterMatch = responseText.match(/===음수량===\s*([\s\S]*?)\s*(?:===|$)/);
    const exerciseMatch = responseText.match(/===운동량===\s*([\s\S]*?)\s*(?:===|$)/);
    const sideEffectMatch = responseText.match(/===부작용===\s*([\s\S]*?)$/);

    return res.status(200).json({
      food: foodMatch ? foodMatch[1].trim() : '식사량 추이를 분석할 수 없습니다.',
      water: waterMatch ? waterMatch[1].trim() : '음수량 추이를 분석할 수 없습니다.',
      exercise: exerciseMatch ? exerciseMatch[1].trim() : '운동량 추이를 분석할 수 없습니다.',
      sideEffect: sideEffectMatch ? sideEffectMatch[1].trim() : '부작용 추이를 분석할 수 없습니다.'
    });
  } catch (error) {
    console.error('추이 분석 생성 오류:', error);
    return res.status(500).json({
      error: '추이 분석 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}
