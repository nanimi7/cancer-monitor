import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './WeightManagement.css';

function WeightManagement({ userId }) {
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [modalWeight, setModalWeight] = useState('');
  const [editingWeight, setEditingWeight] = useState(null);

  // 필터 상태
  const [filterType, setFilterType] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchWeights = useCallback(async () => {
    try {
      setLoading(true);
      const weightsRef = collection(db, 'users', userId, 'weights');
      const q = query(weightsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const weightsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date)
      }));

      setWeights(weightsData);
    } catch (error) {
      console.error('체중 데이터 로드 실패:', error);
      alert('체중 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWeights();
  }, [fetchWeights]);

  // 선택된 날짜의 체중 데이터 찾기
  const getWeightForDate = (date) => {
    return weights.find(w => {
      const weightDate = new Date(w.date);
      return weightDate.toDateString() === date.toDateString();
    });
  };

  // 캘린더에 체중 데이터 또는 + 버튼 표시
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const weightData = getWeightForDate(date);
      if (weightData) {
        return <div className="weight-dot">{weightData.weight}kg</div>;
      } else {
        return <div className="add-button-tile">+</div>;
      }
    }
    return null;
  };

  // 날짜 클릭 핸들러
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const weightData = getWeightForDate(date);

    if (weightData) {
      // 체중 데이터가 있으면 수정 모드
      setModalMode('edit');
      setEditingWeight(weightData);
      setModalWeight(weightData.weight.toString());
      setShowModal(true);
    } else {
      // 체중 데이터가 없으면 추가 모드
      setModalMode('add');
      setModalWeight('');
      setShowModal(true);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    setModalWeight('');
    setEditingWeight(null);
  };

  // 체중 추가
  const handleAddWeight = async (e) => {
    e.preventDefault();

    if (!modalWeight || parseFloat(modalWeight) <= 0) {
      alert('올바른 체중을 입력해주세요.');
      return;
    }

    try {
      const weightsRef = collection(db, 'users', userId, 'weights');
      await addDoc(weightsRef, {
        weight: parseFloat(modalWeight),
        date: selectedDate,
        createdAt: new Date()
      });

      closeModal();
      await fetchWeights();
    } catch (error) {
      console.error('체중 추가 실패:', error);
      alert('체중 기록에 실패했습니다.');
    }
  };

  // 체중 수정
  const handleUpdateWeight = async (e) => {
    e.preventDefault();

    if (!modalWeight || parseFloat(modalWeight) <= 0) {
      alert('올바른 체중을 입력해주세요.');
      return;
    }

    try {
      const weightRef = doc(db, 'users', userId, 'weights', editingWeight.id);
      await updateDoc(weightRef, {
        weight: parseFloat(modalWeight)
      });

      closeModal();
      await fetchWeights();
    } catch (error) {
      console.error('체중 수정 실패:', error);
      alert('체중 수정에 실패했습니다.');
    }
  };

  // 체중 삭제
  const handleDeleteWeight = async () => {
    if (!window.confirm('이 체중 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const weightRef = doc(db, 'users', userId, 'weights', editingWeight.id);
      await deleteDoc(weightRef);
      closeModal();
      await fetchWeights();
    } catch (error) {
      console.error('체중 삭제 실패:', error);
      alert('체중 삭제에 실패했습니다.');
    }
  };

  // 필터링된 데이터 가져오기
  const getFilteredData = useCallback(() => {
    const now = new Date();
    let startDate;

    switch (filterType) {
      case 'day':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);

          return weights.filter(w => {
            const weightDate = new Date(w.date);
            return weightDate >= start && weightDate <= end;
          }).reverse();
        }
        return weights.slice().reverse();
      default:
        return weights.slice().reverse();
    }

    return weights.filter(w => new Date(w.date) >= startDate).reverse();
  }, [weights, filterType, customStartDate, customEndDate]);

  // 그래프용 데이터 포맷
  const getChartData = () => {
    const filteredData = getFilteredData();
    return filteredData.map(w => ({
      date: w.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      체중: w.weight
    }));
  };

  // 체중 변화 경고 체크
  const checkWeightWarning = () => {
    if (weights.length === 0) return null;

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 1개월 데이터
    const oneMonthData = weights.filter(w => new Date(w.date) >= oneMonthAgo).sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3개월 데이터
    const threeMonthData = weights.filter(w => new Date(w.date) >= threeMonthsAgo).sort((a, b) => new Date(a.date) - new Date(b.date));

    let warnings = [];

    // 1개월 체중 변화 체크 (5% 이상)
    if (oneMonthData.length >= 2) {
      const oldestWeight = oneMonthData[0].weight;
      const recentWeight = oneMonthData[oneMonthData.length - 1].weight;
      const changePercent = Math.abs(((recentWeight - oldestWeight) / oldestWeight) * 100);

      if (changePercent >= 5) {
        const changeType = recentWeight > oldestWeight ? '증가' : '감소';
        warnings.push(`최근 1개월간 체중이 ${changePercent.toFixed(1)}% ${changeType}했습니다.`);
      }
    }

    // 3개월 체중 변화 체크 (10% 이상)
    if (threeMonthData.length >= 2) {
      const oldestWeight = threeMonthData[0].weight;
      const recentWeight = threeMonthData[threeMonthData.length - 1].weight;
      const changePercent = Math.abs(((recentWeight - oldestWeight) / oldestWeight) * 100);

      if (changePercent >= 10) {
        const changeType = recentWeight > oldestWeight ? '증가' : '감소';
        warnings.push(`최근 3개월간 체중이 ${changePercent.toFixed(1)}% ${changeType}했습니다.`);
      }
    }

    return warnings.length > 0 ? warnings : null;
  };

  if (loading) {
    return (
      <div className="weight-loading">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  const weightWarnings = checkWeightWarning();

  return (
    <div className="weight-management">
      <h2>체중 관리</h2>

      {/* 캘린더 섹션 */}
      <div className="calendar-section">
        <Calendar
          onChange={handleDateClick}
          value={selectedDate}
          locale="ko-KR"
          tileContent={tileContent}
          formatDay={(locale, date) => date.getDate()}
        />
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {selectedDate.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={modalMode === 'add' ? handleAddWeight : handleUpdateWeight}>
              <div className="form-group">
                <label>체중 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={modalWeight}
                  onChange={(e) => setModalWeight(e.target.value)}
                  placeholder="예: 65.5"
                  required
                  autoFocus
                />
              </div>

              <div className="modal-buttons">
                {modalMode === 'add' ? (
                  <button type="submit" className="save-button">기록하기</button>
                ) : (
                  <>
                    <button type="submit" className="save-button">수정</button>
                    <button type="button" onClick={handleDeleteWeight} className="delete-button">
                      삭제
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 기간설정 + 그래프 통합 섹션 */}
      <div className="chart-filter-section">
        <h3>체중 변화 그래프</h3>

        {/* 필터 버튼 */}
        <div className="filter-buttons">
          <button
            className={filterType === 'day' ? 'active' : ''}
            onClick={() => setFilterType('day')}
          >
            최근 7일
          </button>
          <button
            className={filterType === 'week' ? 'active' : ''}
            onClick={() => setFilterType('week')}
          >
            최근 30일
          </button>
          <button
            className={filterType === 'month' ? 'active' : ''}
            onClick={() => setFilterType('month')}
          >
            최근 90일
          </button>
          <button
            className={filterType === 'custom' ? 'active' : ''}
            onClick={() => setFilterType('custom')}
          >
            기간 설정
          </button>
        </div>

        {filterType === 'custom' && (
          <div className="custom-date-range">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              placeholder="시작일"
            />
            <span>~</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              placeholder="종료일"
            />
          </div>
        )}

        {/* 그래프 */}
        {getChartData().length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={getChartData()} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5f27cd" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5f27cd" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#999', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#f0f0f0' }}
                />
                <YAxis
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: '#999', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#f0f0f0' }}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #f0f0f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="체중"
                  stroke="#5f27cd"
                  strokeWidth={3}
                  fill="url(#colorWeight)"
                  dot={{ fill: '#5f27cd', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#5f27cd' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="no-data-message">
            <p>선택한 기간에 체중 데이터가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 의료진 상담 안내 */}
      {weightWarnings && (
        <div className="weight-warning-section">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>의료진 상담이 필요합니다</h3>
            <ul className="warning-list">
              {weightWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
            <p className="warning-description">
              급격한 체중 변화는 건강 상태와 관련이 있을 수 있습니다.
              담당 의료진과 상담하시기 바랍니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeightManagement;
