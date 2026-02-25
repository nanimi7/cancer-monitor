import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
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

  const getRecordUpdatedAtMs = (record) => {
    const toMs = (value) => {
      if (!value) return 0;
      if (typeof value?.toMillis === 'function') return value.toMillis();
      if (typeof value === 'number') return value;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Math.max(toMs(record.updatedAt), toMs(record.createdAt));
  };

  useEffect(() => {
    loadSymptomRecords();
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (symptomRecords.length > 0) {
      extractCycles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symptomRecords]);

  useEffect(() => {
    if (selectedCycle) {
      extractSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCycle]);

  const loadSymptomRecords = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/symptomRecords`));
      const allRecords = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 날짜별로 최신 레코드만 필터링 (중복 제거)
      const recordsByDate = {};
      allRecords.forEach(record => {
        const previous = recordsByDate[record.date];
        if (!previous || getRecordUpdatedAtMs(record) >= getRecordUpdatedAtMs(previous)) {
          recordsByDate[record.date] = record;
        }
      });

      // 객체를 배열로 변환
      const uniqueRecords = Object.values(recordsByDate);

      setSymptomRecords(uniqueRecords);
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
        // 사용자가 입력한 텍스트 데이터가 있는지 확인
        const hasUserInputText = filteredRecords.some(record =>
          (record.foodIntakeNote && record.foodIntakeNote.trim() !== '') ||
          (record.waterIntakeNote && record.waterIntakeNote.trim() !== '') ||
          (record.exerciseNote && record.exerciseNote.trim() !== '') ||
          (record.symptoms && record.symptoms.trim() !== '')
        );

        if (!hasUserInputText) {
          // 사용자가 입력한 텍스트가 없을 경우 안내 메시지만 표시
          await new Promise(resolve => setTimeout(resolve, 1000));

          const noDataMessage = '분석을 위해서는 기록이 더 쌓여야 합니다. 증상 기록을 계속 입력해주세요.';

          setAiSummary({
            food: noDataMessage,
            water: noDataMessage,
            exercise: noDataMessage,
            bowel: noDataMessage,
            special: noDataMessage,
            comment: '상세한 AI 분석을 위해 식사 메뉴, 음수 내용, 운동 방식, 주요 증상 등을 텍스트로 입력해주세요. 기록이 쌓일수록 더 정확한 분석이 가능합니다.',
          });
          setAiLoading(false);
          return;
        }

        // 이전 차수 데이터 가져오기 (비교 분석용)
        const getPreviousSessionData = () => {
          // 모든 차수와 회차 조합 정렬 (내림차순)
          const allSessionKeys = [];
          symptomRecords.forEach(record => {
            const key = `${record.chemoCycle}|${record.chemoSession}`;
            if (!allSessionKeys.includes(key)) {
              allSessionKeys.push(key);
            }
          });

          // 현재 선택된 차수|회차의 인덱스 찾기
          const currentKey = `${selectedCycle}|${selectedSession}`;
          const sortedKeys = allSessionKeys.sort();
          const currentIndex = sortedKeys.indexOf(currentKey);

          // 이전 차수가 있으면 해당 데이터 반환
          if (currentIndex > 0) {
            const prevKey = sortedKeys[currentIndex - 1];
            const [prevCycle, prevSession] = prevKey.split('|');
            const prevRecords = symptomRecords.filter(
              record => record.chemoCycle === prevCycle && record.chemoSession === prevSession
            );
            return { prevCycle, prevSession, prevRecords };
          }
          return null;
        };

        const previousSessionData = getPreviousSessionData();

        // Serverless Function을 통한 Claude API 호출
        const symptomTexts = filteredRecords
          .map((record) => {
            // 식사량 상세 정보 구성 (새 필드와 기존 필드 호환)
            let foodDetails = '';
            if (record.foodIntakeBreakfast || record.foodIntakeLunch || record.foodIntakeDinner || record.foodIntakeOther) {
              const meals = [];
              if (record.foodIntakeBreakfast) meals.push(`아침: ${record.foodIntakeBreakfast}`);
              if (record.foodIntakeLunch) meals.push(`점심: ${record.foodIntakeLunch}`);
              if (record.foodIntakeDinner) meals.push(`저녁: ${record.foodIntakeDinner}`);
              if (record.foodIntakeOther) meals.push(`기타: ${record.foodIntakeOther}`);
              foodDetails = ` (${meals.join(', ')})`;
            } else if (record.foodIntakeNote) {
              foodDetails = ` (${record.foodIntakeNote})`;
            }

            return `[${record.date}]
- 항암 진행: ${record.chemoCycle} ${record.chemoSession} ${record.chemoDay}
- 식사량: ${record.foodIntakeLevel}%${foodDetails}
- 음수량: 약 ${record.waterIntakeAmount}ml${record.waterIntakeNote ? ` (${record.waterIntakeNote})` : ''}
- 운동량: 약 ${record.exerciseTime}보${record.exerciseNote ? ` (${record.exerciseNote})` : ''}
- 배변: ${record.bowelMovement === 'yes' ? '있음' : '없음'}${record.bowelCondition && record.bowelCondition.length > 0 ? ` (${record.bowelCondition.join(', ')})` : ''}
- 주요 부작용: ${record.sideEffects.join(', ')}
- 상세 증상: ${record.symptoms}`;
          })
          .join('\n\n');

        // 이전 차수 데이터 형식화
        let previousSymptomTexts = null;
        let previousSessionInfo = null;
        if (previousSessionData && previousSessionData.prevRecords.length > 0) {
          previousSessionInfo = {
            cycle: previousSessionData.prevCycle,
            session: previousSessionData.prevSession
          };
          previousSymptomTexts = previousSessionData.prevRecords
            .map((record) => {
              let foodDetails = '';
              if (record.foodIntakeBreakfast || record.foodIntakeLunch || record.foodIntakeDinner || record.foodIntakeOther) {
                const meals = [];
                if (record.foodIntakeBreakfast) meals.push(`아침: ${record.foodIntakeBreakfast}`);
                if (record.foodIntakeLunch) meals.push(`점심: ${record.foodIntakeLunch}`);
                if (record.foodIntakeDinner) meals.push(`저녁: ${record.foodIntakeDinner}`);
                if (record.foodIntakeOther) meals.push(`기타: ${record.foodIntakeOther}`);
                foodDetails = ` (${meals.join(', ')})`;
              } else if (record.foodIntakeNote) {
                foodDetails = ` (${record.foodIntakeNote})`;
              }

              return `[${record.date}]
- 항암 진행: ${record.chemoCycle} ${record.chemoSession} ${record.chemoDay}
- 식사량: ${record.foodIntakeLevel}%${foodDetails}
- 음수량: 약 ${record.waterIntakeAmount}ml${record.waterIntakeNote ? ` (${record.waterIntakeNote})` : ''}
- 운동량: 약 ${record.exerciseTime}보${record.exerciseNote ? ` (${record.exerciseNote})` : ''}
- 배변: ${record.bowelMovement === 'yes' ? '있음' : '없음'}${record.bowelCondition && record.bowelCondition.length > 0 ? ` (${record.bowelCondition.join(', ')})` : ''}
- 주요 부작용: ${record.sideEffects.join(', ')}
- 상세 증상: ${record.symptoms}`;
            })
            .join('\n\n');
        }

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

        // Serverless Function 호출
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          throw new Error('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        }

        const response = await fetch('/api/generate-medical-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            userProfile: {
              age,
              gender: userProfile?.gender,
              disease: userProfile?.disease,
              diagnosisDate: userProfile?.diagnosisDate
            },
            symptomTexts,
            recordCount: filteredRecords.length,
            currentSessionInfo: {
              cycle: selectedCycle,
              session: selectedSession
            },
            previousSessionInfo,
            previousSymptomTexts
          }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const detail = errorBody.details || errorBody.error || `API 호출 실패: ${response.status}`;
          throw new Error(detail);
        }

        const data = await response.json();

        setAiSummary({
          food: data.food,
          water: data.water,
          exercise: data.exercise,
          bowel: data.bowel,
          special: data.special,
          comment: data.comment,
        });
      } catch (aiError) {
        console.error('Claude API 호출 오류:', aiError);
        setAiSummary({
          food: 'AI 분석 생성 중 오류가 발생했습니다.',
          water: 'AI 분석 생성 중 오류가 발생했습니다.',
          exercise: 'AI 분석 생성 중 오류가 발생했습니다.',
          bowel: 'AI 분석 생성 중 오류가 발생했습니다.',
          special: 'AI 분석 생성 중 오류가 발생했습니다.',
          comment: `오류 메시지: ${aiError.message}\n\nAPI 키를 확인하거나 나중에 다시 시도해주세요.`
        });
      } finally {
        setAiLoading(false);
      }

    } catch (error) {
      console.error('요약 생성 오류:', error);
      alert('요약 생성 중 오류가 발생했습니다.');
      setLoading(false);
      setAiLoading(false);
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
    // 고유한 날짜 개수로 계산 (중복 제거)
    const uniqueDates = [...new Set(sortedRecords.map(r => r.date))];
    const totalDays = uniqueDates.length;

    // 배변 횟수 계산
    const bowelMovementCount = sortedRecords.filter(record =>
      record.bowelMovement === 'yes' || record.bowelMovement === '예'
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

            {/* 의료진 전달 사항 - Claude AI */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">🤖</span>
                <h4 className="summary-section-title">의료진 전달 사항 (AI 생성)</h4>
              </div>

              {aiLoading ? (
                <div className="ai-loading-container">
                  <div className="ai-loading-spinner"></div>
                  <div className="ai-loading-text">AI가 증상 데이터를 분석하고 있습니다...</div>
                </div>
              ) : aiSummary ? (
                <>
                  <div className="ai-summary-box">
                    {/* 식사량 분석 */}
                    <div style={{marginBottom: '20px'}}>
                      <div style={{marginBottom: '8px', fontWeight: 700, color: '#374151', fontSize: '15px', display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: '6px'}}>🍽️</span>
                        <span>식사량</span>
                      </div>
                      <div className="ai-summary-content" style={{background: 'linear-gradient(135deg, #8895d4 0%, #7885c2 100%)', color: 'white', padding: '16px', borderRadius: '8px'}}>
                        {aiSummary.food}
                      </div>
                    </div>

                    {/* 음수량 분석 */}
                    <div style={{marginBottom: '20px'}}>
                      <div style={{marginBottom: '8px', fontWeight: 700, color: '#374151', fontSize: '15px', display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: '6px'}}>💧</span>
                        <span>음수량</span>
                      </div>
                      <div className="ai-summary-content" style={{background: 'linear-gradient(135deg, #d888b2 0%, #c678a1 100%)', color: 'white', padding: '16px', borderRadius: '8px'}}>
                        {aiSummary.water}
                      </div>
                    </div>

                    {/* 운동량 분석 */}
                    <div style={{marginBottom: '20px'}}>
                      <div style={{marginBottom: '8px', fontWeight: 700, color: '#374151', fontSize: '15px', display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: '6px'}}>🚶</span>
                        <span>운동량</span>
                      </div>
                      <div className="ai-summary-content" style={{background: 'linear-gradient(135deg, #78a8cc 0%, #6898bc 100%)', color: 'white', padding: '16px', borderRadius: '8px'}}>
                        {aiSummary.exercise}
                      </div>
                    </div>

                    {/* 배변 분석 */}
                    <div style={{marginBottom: '20px'}}>
                      <div style={{marginBottom: '8px', fontWeight: 700, color: '#374151', fontSize: '15px', display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: '6px'}}>🚽</span>
                        <span>배변</span>
                      </div>
                      <div className="ai-summary-content" style={{background: 'linear-gradient(135deg, #88c6b7 0%, #78b6a7 100%)', color: 'white', padding: '16px', borderRadius: '8px'}}>
                        {aiSummary.bowel}
                      </div>
                    </div>

                    {/* 특이사항 및 부작용 */}
                    <div style={{marginBottom: '20px'}}>
                      <div style={{marginBottom: '8px', fontWeight: 700, color: '#374151', fontSize: '15px', display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: '6px'}}>⚠️</span>
                        <span>특이사항 및 부작용</span>
                      </div>
                      <div className="ai-summary-content" style={{background: 'linear-gradient(135deg, #f4a5ae 0%, #e4959e 100%)', color: 'white', padding: '16px', borderRadius: '8px'}}>
                        {aiSummary.special}
                      </div>
                    </div>

                    {/* AI 코멘트 */}
                    <div style={{marginBottom: '20px'}}>
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
