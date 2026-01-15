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
    const { userProfile, symptomRecords } = req.body;

    if (!userProfile || !symptomRecords || symptomRecords.length === 0) {
      return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
    });

    // 증상 기록을 텍스트로 정리
    const symptomTexts = symptomRecords
      .map((record, index) => {
        return `[${record.date}]
- 항암 진행: ${record.chemoCycle} ${record.chemoSession} ${record.chemoDay}
- 식사량: ${record.foodIntakeLevel}%${record.foodIntakeNote ? ` (${record.foodIntakeNote})` : ''}
- 음수량: 약 ${record.waterIntakeAmount}ml${record.waterIntakeNote ? ` (${record.waterIntakeNote})` : ''}
- 운동량: 약 ${record.exerciseTime}보${record.exerciseNote ? ` (${record.exerciseNote})` : ''}
- 배변: ${record.bowelMovement === 'yes' ? '있음' : '없음'}${record.bowelCondition && record.bowelCondition.length > 0 ? ` (${record.bowelCondition.join(', ')})` : ''}
- 주요 부작용: ${record.sideEffects.join(', ')}
- 상세 증상: ${record.symptoms}`;
      })
      .join('\n\n');

    const prompt = `당신은 의료진에게 환자의 항암치료 경과를 전달하는 의료 보조 AI입니다.

**환자 정보:**
- 나이: ${userProfile.age || '정보 없음'}세
- 성별: ${userProfile.gender === 'male' ? '남성' : userProfile.gender === 'female' ? '여성' : '정보 없음'}
- 진단명: ${userProfile.diagnosis || '정보 없음'}
- 최초 진단일: ${userProfile.diagnosisDate || '정보 없음'}

**증상 기록 (최근 ${symptomRecords.length}건):**
${symptomTexts}

다음 두 가지를 생성해주세요:

1. **의료진 전달 주요 증상 요약 (10줄 이내)**
   - 의료진이 빠르게 파악할 수 있도록 핵심적인 증상과 변화 추이를 압축하여 정리
   - 특히 주의가 필요한 증상, 악화 추세, 개선 추세를 명확히 표현
   - 식사량, 음수량, 배변, 부작용 등의 패턴 분석 포함

2. **AI 코멘트**
   - 환자의 나이, 진단명, 증상을 종합적으로 고려
   - 해당 증상들이 항암치료 과정에서 정상적인 반응인지, 과한 부분이 있는지 평가
   - 특별히 주의가 필요한 부분이 있다면 언급
   - 격려와 함께 실질적인 조언 제공

**응답 형식 (반드시 이 형식을 따라주세요):**
===주요증상요약===
[10줄 이내의 요약 내용]

===AI코멘트===
[AI 코멘트 내용]`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
