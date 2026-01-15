import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import '../styles/AISummary.css';

function AISummary({ userId }) {
  const [symptomRecords, setSymptomRecords] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showDailyRecords, setShowDailyRecords] = useState(false);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    loadSymptomRecords();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (symptomRecords.length > 0) {
      extractCycles();
    }
  }, [symptomRecords]);

  useEffect(() => {
    if (selectedCycle) {
      extractSessions();
    }
  }, [selectedCycle]);

  const loadSymptomRecords = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/symptomRecords`));
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSymptomRecords(records);
    } catch (error) {
      console.error('증상 기록 로드 오류:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/profile`));
      if (!querySnapshot.empty) {
        const profileData = querySnapshot.docs[0].data();
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('사용자 프로필 로드 오류:', error);
    }
  };

  const extractCycles = () => {
    const uniqueCycles = [...new Set(symptomRecords.map(record => record.chemoCycle))];
    setCycles(uniqueCycles.sort());
  };

  const extractSessions = () => {
    const filteredRecords = symptomRecords.filter(record => record.chemoCycle === selectedCycle);
    const uniqueSessions = [...new Set(filteredRecords.map(record => record.chemoSession))];
    setSessions(uniqueSessions.sort());
  };

  const generateAISummary = async () => {
    if (!selectedCycle || !selectedSession) {
      alert('항암 진행 횟수와 항암 회차를 선택해주세요.');
      return;
    }

    setLoading(true);
    setAiLoading(true);
    setSummary('');
    setAiSummary(null);

    try {
      const filteredRecords = symptomRecords.filter(
        record => record.chemoCycle === selectedCycle && record.chemoSession === selectedSession
      );

      if (filteredRecords.length === 0) {
        alert('선택한 기간에 기록된 데이터가 없습니다.');
        setLoading(false);
        setAiLoading(false);
        return;
      }

      // 통계 기반 요약 생성
      const summaryHTML = generateStatisticalSummaryHTML(filteredRecords);
      setSummary(summaryHTML);
      setLoading(false);

      // Claude API 호출하여 의료진 전달사항 생성
      try {
        const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

        // 목업 데이터 사용 (테스트용)
        const useMockData = true; // API 크레딧이 있으면 false로 변경

        if (useMockData || !apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
          // 목업 응답 생성
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 (실제 API 호출 시뮬레이션)

          const mockSummary = `1. 전반적인 식사량이 ${filteredRecords.length}일 동안 평균 ${Math.round(filteredRecords.reduce((sum, r) => sum + parseInt(r.foodIntakeLevel || 0), 0) / filteredRecords.length)}% 수준으로 유지되고 있습니다.

2. 주요 부작용으로 ${filteredRecords[0]?.sideEffects?.slice(0, 3).join(', ') || '오심, 구토'} 등이 반복적으로 나타나고 있으며, 특히 치료 초기에 증상이 집중되어 있습니다.

3. 음수량은 대체로 권장 수준(1.5L 이상)을 유지하고 있으나, 일부 날짜에는 부족한 경향을 보입니다.

4. 운동량은 ${filteredRecords.filter(r => parseInt(r.exerciseTime) > 1000).length}일 동안 1천보 이상을 기록하여 양호한 편입니다.

5. 배변 패턴은 ${Math.round((filteredRecords.filter(r => r.bowelMovement === 'yes').length / filteredRecords.length) * 100)}% 정도로, 변비 경향이 일부 관찰됩니다.

6. 증상의 전반적인 추세는 치료 초기 대비 후반부로 갈수록 완화되는 양상을 보이고 있습니다.

7. 특이사항으로 ${filteredRecords[filteredRecords.length - 1]?.date || '최근'} 기록에서 ${filteredRecords[filteredRecords.length - 1]?.symptoms?.substring(0, 50) || '전반적인 컨디션 호전'}이 언급되었습니다.`;

          // 나이 계산 (목업용)
          const calculateAge = (birthdate) => {
            if (!birthdate) return null;
            const birth = new Date(birthdate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return age;
          };

          const age = userProfile?.birthdate ? calculateAge(userProfile.birthdate) : null;

          const mockComment = `환자분의 연령(${age ? `${age}세` : '정보 없음'})과 진단명(${userProfile?.disease || '정보 없음'})을 고려할 때, 현재 나타나는 증상들은 항암치료 과정에서 일반적으로 예상되는 반응 범위 내에 있습니다.

**긍정적인 부분:**
- 식사량이 평균 50% 이상 유지되고 있어 영양 섭취가 비교적 양호합니다.
- 운동량을 꾸준히 유지하려는 노력이 보이며, 이는 회복에 매우 도움이 됩니다.
- 시간이 지남에 따라 증상이 완화되는 추세를 보이고 있습니다.

**주의가 필요한 부분:**
- 음수량이 부족한 날이 있으니, 하루 2L 이상을 목표로 조금씩 자주 마시는 것을 권장합니다.
- 변비 경향이 있다면 충분한 수분 섭취와 함께 섬유질이 풍부한 음식을 섭취하시고, 필요시 의료진과 상담하세요.


💪 잘하고 계십니다. 꾸준히 기록하는 것만으로도 치료에 큰 도움이 됩니다. 힘내서 회복에 집중하세요!

*본 코멘트는 목업 데이터로 생성되었습니다. 실제 AI 분석을 위해서는 Claude API 크레딧이 필요합니다.`;

          setAiSummary({
            summary: mockSummary,
            comment: mockComment,
          });
          setAiLoading(false);
          return;
        }

        // 실제 Claude API 호출
        const Anthropic = (await import('@anthropic-ai/sdk')).default;

        const anthropic = new Anthropic({
          apiKey: apiKey,
          dangerouslyAllowBrowser: true // 개발 환경에서만 사용
        });

        // 증상 기록을 텍스트로 정리
        const symptomTexts = filteredRecords
          .map((record) => {
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

        // 나이 계산
        const calculateAge = (birthdate) => {
          if (!birthdate) return null;
          const birth = new Date(birthdate);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age;
        };

        const age = userProfile?.birthdate ? calculateAge(userProfile.birthdate) : null;

        // 디버깅: 프로필 데이터 확인
        console.log('User Profile:', userProfile);
        console.log('Birthdate:', userProfile?.birthdate);
        console.log('Calculated Age:', age);
        console.log('Gender:', userProfile?.gender);
        console.log('Disease:', userProfile?.disease);

        const prompt = `당신은 의료진에게 환자의 항암치료 경과를 전달하는 의료 보조 AI입니다.

**환자 정보:**
- 나이: ${age ? `${age}세` : '정보 없음'}
- 성별: ${userProfile?.gender === 'male' ? '남성' : userProfile?.gender === 'female' ? '여성' : '정보 없음'}
- 진단명: ${userProfile?.disease || '정보 없음'}
- 최초 진단일: ${userProfile?.diagnosisDate || '정보 없음'}

**증상 기록 (최근 ${filteredRecords.length}건):**
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
   - **반드시 마지막에는 빈 줄(\n\n)을 넣고, 따뜻한 이모지(💪, 🌟, 💙 등)와 함께 "잘하고 계십니다. 힘내서 회복에 집중하세요!" 같은 짧고 따뜻한 응원 메시지를 포함할 것**

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

        setAiSummary({
          summary,
          comment,
        });
      } catch (aiError) {
        console.error('Claude API 호출 오류:', aiError);
        setAiSummary({
          summary: 'AI 요약 생성 중 오류가 발생했습니다.',
          comment: `오류 메시지: ${aiError.message}\n\nAPI 키를 확인하거나 나중에 다시 시도해주세요.`
        });
      } finally {
        setAiLoading(false);
      }

      // 추이 분석 생성 (AI 활용)
      await generateTrendAnalysis(filteredRecords);

    } catch (error) {
      console.error('요약 생성 오류:', error);
      alert('요약 생성 중 오류가 발생했습니다.');
      setLoading(false);
      setAiLoading(false);
      setTrendLoading(false);
    }
  };

  const generateTrendAnalysis = async (records) => {
    try {
      setTrendLoading(true);
      const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

      const useMockData = true;

      // 식사량 라벨 맵핑
      const foodLabelMap = {
        '0': '전혀 못먹음',
        '25': '평소의 1/4 정도',
        '50': '평소의 50%',
        '75': '평소의 75%',
        '100': '평소만큼'
      };

      // 음수량 라벨 맵핑
      const waterLabelMap = {
        '500': '500ml 이하',
        '1000': '500~1000ml',
        '1500': '1000~1500ml',
        '2000': '1500~2000ml',
        '2500': '2000ml 이상'
      };

      // 운동량 라벨 맵핑
      const exerciseLabelMap = {
        '0': '0보',
        '500': '1천보 미만',
        '1500': '1천~2천보',
        '3000': '2천~5천보',
        '7500': '5천~1만보',
        '10000': '1만보 이상'
      };

      if (useMockData || !apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
        // Mock 추이 분석 (빈도 기반)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 식사량 빈도 계산
        const foodCounts = {};
        records.forEach(r => {
          const label = foodLabelMap[r.foodIntakeLevel] || '미기록';
          foodCounts[label] = (foodCounts[label] || 0) + 1;
        });

        let foodAnalysis = `📊 식사량 분석 (총 ${records.length}일)\n\n`;
        Object.entries(foodCounts).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
          foodAnalysis += `• ${label}: ${count}일\n`;
        });
        foodAnalysis += `\n➡️ 전체적으로 ${foodCounts['평소만큼'] >= records.length / 2 ? '양호한' : '관리 필요한'} 추세\n`;
        foodAnalysis += foodCounts['전혀 못먹음'] > 2 ? '의료진 상담 권장' : '현 상태 유지';

        // 음수량 빈도 계산
        const waterCounts = {};
        records.forEach(r => {
          const label = waterLabelMap[r.waterIntakeAmount] || '미기록';
          waterCounts[label] = (waterCounts[label] || 0) + 1;
        });

        let waterAnalysis = `💧 음수량 분석 (총 ${records.length}일)\n\n`;
        Object.entries(waterCounts).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
          waterAnalysis += `• ${label}: ${count}일\n`;
        });
        waterAnalysis += `\n➡️ 수분 섭취 ${waterCounts['2000ml 이상'] >= records.length / 3 ? '양호' : '개선 필요'}\n`;
        waterAnalysis += '꾸준한 수분 섭취 유지';

        // 운동량 빈도 계산
        const exerciseCounts = {};
        records.forEach(r => {
          const label = exerciseLabelMap[r.exerciseTime] || '미기록';
          exerciseCounts[label] = (exerciseCounts[label] || 0) + 1;
        });

        let exerciseAnalysis = `🚶 운동량 분석 (총 ${records.length}일)\n\n`;
        Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
          exerciseAnalysis += `• ${label}: ${count}일\n`;
        });
        exerciseAnalysis += `\n➡️ 치료 중 적절한 활동량\n`;
        exerciseAnalysis += '무리하지 않는 범위 유지';

        // 부작용 빈도 계산
        const sideEffectCounts = {};
        records.forEach(r => {
          if (r.sideEffects && Array.isArray(r.sideEffects)) {
            r.sideEffects.forEach(effect => {
              sideEffectCounts[effect] = (sideEffectCounts[effect] || 0) + 1;
            });
          }
        });

        let sideEffectAnalysis = `⚠️ 부작용 분석 (총 ${records.length}일)\n\n`;
        const topEffects = Object.entries(sideEffectCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        topEffects.forEach(([effect, count]) => {
          sideEffectAnalysis += `• ${effect}: ${count}회\n`;
        });
        sideEffectAnalysis += `\n➡️ 일반적인 치료 반응 범위\n`;
        sideEffectAnalysis += '증상 심화 시 즉시 상담';

        const mockTrendObj = {
          food: foodAnalysis,
          water: waterAnalysis,
          exercise: exerciseAnalysis,
          sideEffect: sideEffectAnalysis
        };

        setTrendAnalysis(mockTrendObj);
        setTrendLoading(false);
        return;
      }

      // 실제 Claude API 호출
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      // 데이터 요약 (라벨 포함)
      const dataText = records.map((r, idx) => {
        const foodLabel = foodLabelMap[r.foodIntakeLevel] || '미기록';
        const waterLabel = waterLabelMap[r.waterIntakeAmount] || '미기록';
        const exerciseLabel = exerciseLabelMap[r.exerciseTime] || '미기록';
        return `${idx + 1}일차: 식사[${foodLabel}], 음수[${waterLabel}], 운동[${exerciseLabel}], 부작용[${r.sideEffects?.join(', ')}]`;
      }).join('\n');

      const prompt = `다음은 항암치료 환자의 일별 기록입니다:

${dataText}

**요청사항:**
위 데이터를 분석하여 각 항목별로 빈도 기반 추이를 분석해주세요.

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

      setTrendAnalysis({
        food: foodMatch ? foodMatch[1].trim() : '식사량 추이를 분석할 수 없습니다.',
        water: waterMatch ? waterMatch[1].trim() : '음수량 추이를 분석할 수 없습니다.',
        exercise: exerciseMatch ? exerciseMatch[1].trim() : '운동량 추이를 분석할 수 없습니다.',
        sideEffect: sideEffectMatch ? sideEffectMatch[1].trim() : '부작용 추이를 분석할 수 없습니다.'
      });
      setTrendLoading(false);

    } catch (error) {
      console.error('추이 분석 생성 오류:', error);
      setTrendAnalysis({
        food: '분석 오류',
        water: '분석 오류',
        exercise: '분석 오류',
        sideEffect: '분석 오류'
      });
      setTrendLoading(false);
    }
  };

  const generateStatisticalSummaryHTML = (records) => {
    // 기록 정렬 (날짜순)
    const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 부작용 빈도 계산
    const sideEffectCount = {};
    sortedRecords.forEach(record => {
      if (record.sideEffects && Array.isArray(record.sideEffects)) {
        record.sideEffects.forEach(effect => {
          sideEffectCount[effect] = (sideEffectCount[effect] || 0) + 1;
        });
      }
    });

    const sortedSideEffects = Object.entries(sideEffectCount)
      .sort((a, b) => b[1] - a[1]);

    // 기간 정보
    const startDate = sortedRecords[0].date;
    const endDate = sortedRecords[sortedRecords.length - 1].date;
    const totalDays = sortedRecords.length;

    // 배변 횟수 계산
    const bowelMovementCount = sortedRecords.filter(record =>
      record.bowelMovement === '예'
    ).length;

    // 식사량 추이 분석
    const analyzeFoodIntakeTrend = (records) => {
      if (records.length === 0) return '데이터 없음';

      const foodLabelMap = {
        '0': '섭취 안함',
        '25': '평소의 1/4 정도',
        '50': '평소의 50%',
        '75': '평소의 75%',
        '100': '평소만큼'
      };

      const dailyData = records.map((record, index) => ({
        day: index + 1,
        value: record.foodIntakeLevel,
        label: foodLabelMap[record.foodIntakeLevel] || '미기록'
      })).filter(d => d.value !== undefined && d.value !== '');

      if (dailyData.length === 0) return '데이터 없음';

      // 연속된 동일 값 구간 찾기
      const segments = [];
      let currentSegment = { start: dailyData[0].day, end: dailyData[0].day, value: dailyData[0].value, label: dailyData[0].label };

      for (let i = 1; i < dailyData.length; i++) {
        if (dailyData[i].value === currentSegment.value) {
          currentSegment.end = dailyData[i].day;
        } else {
          segments.push(currentSegment);
          currentSegment = { start: dailyData[i].day, end: dailyData[i].day, value: dailyData[i].value, label: dailyData[i].label };
        }
      }
      segments.push(currentSegment);

      // 텍스트로 변환
      return segments.map(seg => {
        if (seg.start === seg.end) {
          return `${seg.start}일차: ${seg.label}`;
        } else {
          return `${seg.start}~${seg.end}일차: ${seg.label} 유지`;
        }
      }).join('\n        ');
    };

    // 음수량 추이 분석
    const analyzeWaterIntakeTrend = (records) => {
      if (records.length === 0) return '데이터 없음';

      const waterLabelMap = {
        '500': '500ml 이하',
        '1000': '500~1000ml',
        '1500': '1000~1500ml',
        '2000': '1500~2000ml',
        '2500': '2000ml 이상'
      };

      const waterCounts = {};
      records.forEach(record => {
        const value = record.waterIntakeAmount;
        if (value !== undefined && value !== '') {
          const label = waterLabelMap[value] || '미기록';
          waterCounts[label] = (waterCounts[label] || 0) + 1;
        }
      });

      if (Object.keys(waterCounts).length === 0) return '데이터 없음';

      // 가장 많이 선택한 구간 찾기
      const sorted = Object.entries(waterCounts).sort((a, b) => b[1] - a[1]);
      const mostFrequent = sorted[0];

      return `${mostFrequent[0]}를 가장 많이 섭취 (${mostFrequent[1]}회)`;
    };

    // 운동량 추이 분석
    const analyzeExerciseTrend = (records) => {
      if (records.length === 0) return '데이터 없음';

      const exerciseLabelMap = {
        '0': '0보',
        '500': '1천보 미만',
        '1500': '1천~2천보',
        '3000': '2천~5천보',
        '7500': '5천~1만보',
        '10000': '1만보 이상'
      };

      const exerciseCounts = {};
      records.forEach(record => {
        const value = record.exerciseTime;
        if (value !== undefined && value !== '') {
          const label = exerciseLabelMap[value] || '미기록';
          exerciseCounts[label] = (exerciseCounts[label] || 0) + 1;
        }
      });

      if (Object.keys(exerciseCounts).length === 0) return '데이터 없음';

      // 가장 많이 선택한 구간 찾기
      const sorted = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]);
      const mostFrequent = sorted[0];

      return `${mostFrequent[0]}를 가장 많이 기록 (${mostFrequent[1]}회)`;
    };

    const foodTrend = analyzeFoodIntakeTrend(sortedRecords);
    const waterTrend = analyzeWaterIntakeTrend(sortedRecords);
    const exerciseTrend = analyzeExerciseTrend(sortedRecords);

    // 주요 증상 데이터 수집
    const symptomsWithDates = sortedRecords
      .filter(r => r.symptoms && r.symptoms.trim() !== '')
      .map(r => ({
        date: r.date,
        day: sortedRecords.indexOf(r) + 1,
        text: r.symptoms.trim()
      }));

    // HTML 생성
    return {
      startDate,
      endDate,
      totalDays,
      foodTrend,
      waterTrend,
      exerciseTrend,
      bowelMovementCount,
      sideEffectCount,
      sortedSideEffects,
      symptomsWithDates
    };
  };

  return (
    <div className="ai-summary">
      <h2>AI 요약</h2>

      <div className="selection-container">
        <div className="form-group">
          <label htmlFor="cycle">항암 진행 횟수 선택</label>
          <select
            id="cycle"
            value={selectedCycle}
            onChange={(e) => {
              setSelectedCycle(e.target.value);
              setSelectedSession('');
              setSummary('');
            }}
          >
            <option value="">선택해주세요</option>
            {cycles.map(cycle => (
              <option key={cycle} value={cycle}>{cycle}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="session">항암 회차 선택</label>
          <select
            id="session"
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              setSummary('');
            }}
            disabled={!selectedCycle}
          >
            <option value="">선택해주세요</option>
            {sessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>
        </div>

        <button
          className="generate-button"
          onClick={generateAISummary}
          disabled={!selectedCycle || !selectedSession || loading}
        >
          {loading ? 'AI 요약 생성 중...' : 'AI 요약 생성'}
        </button>
      </div>

      {summary && (
        <div className="summary-result">
          <h3>📊 요약 결과</h3>
          <div className="summary-content">
            {/* 선택된 기간 */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">📅</span>
                <h4 className="summary-section-title">선택된 기간</h4>
              </div>
              <div className="summary-info-grid">
                <div className="summary-info-item">
                  <span className="summary-info-label">항암 진행 횟수</span>
                  <span className="summary-info-value">{selectedCycle}</span>
                </div>
                <div className="summary-info-item">
                  <span className="summary-info-label">항암 회차</span>
                  <span className="summary-info-value">{selectedSession}</span>
                </div>
                <div className="summary-info-item">
                  <span className="summary-info-label">기록 기간</span>
                  <span className="summary-info-value">{summary.startDate} ~ {summary.endDate}</span>
                </div>
                <div className="summary-info-item">
                  <span className="summary-info-label">총 기록 일수</span>
                  <span className="summary-info-value">{summary.totalDays}일</span>
                </div>
              </div>
            </div>

            {/* AI 추이 분석 */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">📊</span>
                <h4 className="summary-section-title">AI 추이 분석</h4>
              </div>

              {trendLoading ? (
                <>
                  {/* 스켈레톤 로딩 */}
                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">🍽️ 식사량 추이</h5>
                    <div className="skeleton-card"></div>
                  </div>
                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">💧 음수량 추이</h5>
                    <div className="skeleton-card"></div>
                  </div>
                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">🚶 운동량 추이</h5>
                    <div className="skeleton-card"></div>
                  </div>
                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">⚠️ 부작용 추이</h5>
                    <div className="skeleton-card"></div>
                  </div>
                </>
              ) : trendAnalysis ? (
                <>
                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">🍽️ 식사량 추이</h5>
                    <div className="stats-card" style={{background: 'linear-gradient(135deg, #8895d4 0%, #7885c2 100%)'}}>
                      <div className="stats-card-content" style={{whiteSpace: 'pre-wrap'}}>
                        {trendAnalysis.food}
                      </div>
                    </div>
                  </div>

                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">💧 음수량 추이</h5>
                    <div className="stats-card" style={{background: 'linear-gradient(135deg, #d888b2 0%, #c678a1 100%)'}}>
                      <div className="stats-card-content" style={{whiteSpace: 'pre-wrap'}}>
                        {trendAnalysis.water}
                      </div>
                    </div>
                  </div>

                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">🚶 운동량 추이</h5>
                    <div className="stats-card" style={{background: 'linear-gradient(135deg, #78a8cc 0%, #6898bc 100%)'}}>
                      <div className="stats-card-content" style={{whiteSpace: 'pre-wrap'}}>
                        {trendAnalysis.exercise}
                      </div>
                    </div>
                  </div>

                  <div className="trend-card-wrapper">
                    <h5 className="trend-card-title">⚠️ 부작용 추이</h5>
                    <div className="stats-card" style={{background: 'linear-gradient(135deg, #88c6b7 0%, #78b6a7 100%)'}}>
                      <div className="stats-card-content" style={{whiteSpace: 'pre-wrap'}}>
                        {trendAnalysis.sideEffect}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* 의료진 전달 사항 - Claude AI */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">🤖</span>
                <h4 className="summary-section-title">의료진 전달 사항 (AI 생성)</h4>
              </div>

              {aiLoading ? (
                <div style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>
                  <div className="loading-spinner" style={{margin: '0 auto 15px'}}></div>
                  <div>AI가 의료진 전달사항을 생성하고 있습니다...</div>
                </div>
              ) : aiSummary ? (
                <>
                  <div className="ai-summary-box">
                    <div style={{marginBottom: '20px'}}>
                      <div style={{marginBottom: '12px', fontWeight: 700, color: '#374151', fontSize: '16px'}}>
                        📋 주요 증상 요약 (의료진 전달용)
                      </div>
                      <div className="ai-summary-content">
                        {aiSummary.summary}
                      </div>
                    </div>

                    <div>
                      <div className="ai-comment-header">
                        💬 AI 코멘트 (참고용)
                      </div>
                      <div className="ai-comment-content">
                        {aiSummary.comment}
                      </div>
                    </div>

                    {/* 주의 문구 */}
                    <div className="ai-disclaimer">
                      ⚠️ <strong>중요 안내</strong><br/>
                      본 AI 코멘트는 참고용 정보로, 의학적 진단이나 치료 결정을 대체할 수 없습니다.<br/>
                      모든 증상과 건강 관련 결정은 반드시 담당 의료진과 상의하시기 바랍니다.
                    </div>
                  </div>

                  {/* 일자별 증상 기록 - 토글 */}
                  <div style={{marginTop: '24px'}}>
                    <button
                      className="toggle-button"
                      onClick={() => setShowDailyRecords(!showDailyRecords)}
                    >
                      <span>{showDailyRecords ? '▼' : '▶'}</span>
                      <span style={{marginLeft: '8px'}}>일자별 상세 증상 기록 {showDailyRecords ? '접기' : '펼치기'}</span>
                    </button>

                    {showDailyRecords && (
                      <div style={{marginTop: '16px'}}>
                        {summary.symptomsWithDates.length > 0 ? (
                          summary.symptomsWithDates.map((symptom, index) => (
                            <div key={index} className="symptom-record">
                              <div className="symptom-date">{symptom.day}일차 ({symptom.date})</div>
                              <div className="symptom-text">{symptom.text}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{padding: '20px', textAlign: 'center', background: '#f3f4f6', borderRadius: '8px', color: '#6b7280'}}>
                            특이사항 없음
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {!summary && !loading && (
        <div className="placeholder">
          항암 진행 횟수와 항암 회차를 선택한 후 'AI 요약 생성' 버튼을 클릭하세요.
        </div>
      )}
    </div>
  );
}

export default AISummary;
