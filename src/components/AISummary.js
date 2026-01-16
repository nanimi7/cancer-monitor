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

        if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
          // 목업 응답 생성
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 (실제 API 호출 시뮬레이션)

          const avgFood = Math.round(filteredRecords.reduce((sum, r) => sum + parseInt(r.foodIntakeLevel || 0), 0) / filteredRecords.length);

          const mockFood = `전반적인 식사량이 ${filteredRecords.length}일 동안 평균 ${avgFood}% 수준으로 유지되고 있습니다. 기록된 메뉴를 보면 죽, 미역국 등 소화가 쉬운 음식 위주로 섭취하고 있어 치료 중 적절한 선택입니다.`;

          const mockWater = `음수량은 대체로 권장 수준(1.5L 이상)을 유지하고 있으나, 일부 날짜에는 부족한 경향을 보입니다. 하루 2L 이상을 목표로 조금씩 자주 마시는 것을 권장합니다.`;

          const mockExercise = `운동량은 ${filteredRecords.filter(r => parseInt(r.exerciseTime) > 1000).length}일 동안 1천보 이상을 기록하여 양호한 편입니다. 산책 위주의 가벼운 활동으로 무리하지 않게 관리하고 계십니다.`;

          const mockBowel = `배변 패턴은 ${Math.round((filteredRecords.filter(r => r.bowelMovement === 'yes').length / filteredRecords.length) * 100)}% 정도로, 변비 경향이 일부 관찰됩니다. 충분한 수분 섭취와 섬유질 섭취를 권장합니다.`;

          const mockSpecial = `주요 부작용으로 ${filteredRecords[0]?.sideEffects?.slice(0, 3).join(', ') || '오심, 구토'} 등이 반복적으로 나타나고 있으며, 특히 치료 초기에 증상이 집중되어 있습니다. 증상의 전반적인 추세는 치료 초기 대비 후반부로 갈수록 완화되는 양상을 보이고 있습니다.`;

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

전반적으로 식사량과 운동량을 꾸준히 유지하려는 노력이 보이며, 이는 회복에 매우 도움이 됩니다. 시간이 지남에 따라 증상이 완화되는 추세를 보이고 있는 점도 긍정적입니다.

💪 잘하고 계십니다. 꾸준히 기록하는 것만으로도 치료에 큰 도움이 됩니다. 힘내서 회복에 집중하세요!

*본 코멘트는 목업 데이터로 생성되었습니다. 실제 AI 분석을 위해서는 Claude API 크레딧이 필요합니다.`;

          setAiSummary({
            food: mockFood,
            water: mockWater,
            exercise: mockExercise,
            bowel: mockBowel,
            special: mockSpecial,
            comment: mockComment,
          });
          setAiLoading(false);
          return;
        }

        // Serverless Function을 통한 Claude API 호출
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
        const response = await fetch('/api/generate-medical-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userProfile: {
              age,
              gender: userProfile?.gender,
              disease: userProfile?.disease,
              diagnosisDate: userProfile?.diagnosisDate
            },
            symptomTexts,
            recordCount: filteredRecords.length
          }),
        });

        if (!response.ok) {
          throw new Error(`API 호출 실패: ${response.status}`);
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
