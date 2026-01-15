import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import '../styles/AISummary.css';

function AISummary() {
  const [symptomRecords, setSymptomRecords] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSymptomRecords();
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
      const querySnapshot = await getDocs(collection(db, 'symptomRecords'));
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSymptomRecords(records);
    } catch (error) {
      console.error('증상 기록 로드 오류:', error);
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
    setSummary('');

    try {
      const filteredRecords = symptomRecords.filter(
        record => record.chemoCycle === selectedCycle && record.chemoSession === selectedSession
      );

      if (filteredRecords.length === 0) {
        alert('선택한 기간에 기록된 데이터가 없습니다.');
        setLoading(false);
        return;
      }

      // 통계 기반 요약 생성
      const summaryHTML = generateStatisticalSummaryHTML(filteredRecords);

      // 실제 처리 중인 것처럼 약간의 지연 추가
      setTimeout(() => {
        setSummary(summaryHTML);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('요약 생성 오류:', error);
      alert('요약 생성 중 오류가 발생했습니다.');
      setLoading(false);
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

            {/* 상세 통계 */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">📊</span>
                <h4 className="summary-section-title">상세 통계</h4>
              </div>

              <div className="stats-card" style={{background: 'linear-gradient(135deg, #8895d4 0%, #7885c2 100%)'}}>
                <div className="stats-card-header">🍽️ 식사량 추이</div>
                <div className="stats-card-content" dangerouslySetInnerHTML={{__html: summary.foodTrend.replace(/\n/g, '<br/>')}}></div>
              </div>

              <div className="stats-card" style={{background: 'linear-gradient(135deg, #d888b2 0%, #c678a1 100%)'}}>
                <div className="stats-card-header">💧 음수량 추이</div>
                <div className="stats-card-content">{summary.waterTrend}</div>
              </div>

              <div className="stats-card" style={{background: 'linear-gradient(135deg, #78a8cc 0%, #6898bc 100%)'}}>
                <div className="stats-card-header">🚶 운동량 추이</div>
                <div className="stats-card-content">{summary.exerciseTrend}</div>
              </div>

              <div className="stats-card" style={{background: 'linear-gradient(135deg, #88c6b7 0%, #78b6a7 100%)'}}>
                <div className="stats-card-header">🚽 배변 횟수</div>
                <div className="stats-card-content">전체 기간 중 {summary.bowelMovementCount}회</div>
              </div>
            </div>

            {/* 주요 부작용 */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">📈</span>
                <h4 className="summary-section-title">주요 부작용 발생 빈도</h4>
              </div>
              {Object.keys(summary.sideEffectCount).length > 0 ? (
                <div>
                  {summary.sortedSideEffects.map(([effect, count]) => {
                    const percentage = ((count / summary.totalDays) * 100).toFixed(0);
                    return (
                      <div key={effect} className="side-effect-bar">
                        <div className="side-effect-label">{effect}</div>
                        <div className="side-effect-graph">
                          <div
                            className="side-effect-bar-fill"
                            style={{width: `${percentage}%`, minWidth: '60px'}}
                          >
                            {percentage}%
                          </div>
                          <div className="side-effect-count">{count}회</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{color: '#6b7280', fontSize: '14px'}}>기록된 부작용 없음</p>
              )}
            </div>

            {/* 의료진 전달 사항 */}
            <div className="summary-section">
              <div className="summary-section-header">
                <span className="summary-section-icon">💡</span>
                <h4 className="summary-section-title">의료진 전달 사항</h4>
              </div>
              <div style={{marginBottom: '12px', fontWeight: 600, color: '#374151'}}>📝 주요 증상 기록</div>
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
