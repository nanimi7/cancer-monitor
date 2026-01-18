import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import '../styles/DailySymptomCalendar.css';
import BottomSheet from './BottomSheet';

function DailySymptomCalendar({ userId }) {
  const [date, setDate] = useState(new Date());
  const [symptomRecords, setSymptomRecords] = useState({});
  const [selectedDateRecord, setSelectedDateRecord] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    chemoCycle: '',
    chemoSession: '',
    chemoDay: '',
    foodIntakeLevel: '',
    foodIntakeNote: '',
    waterIntakeAmount: '',
    waterIntakeNote: '',
    exerciseTime: '',
    exerciseNote: '',
    bowelMovement: '',
    bowelCondition: [],
    sideEffects: [],
    symptoms: ''
  });
  const [errors, setErrors] = useState({});
  const [activeBottomSheet, setActiveBottomSheet] = useState(null);

  const sideEffectOptions = ['없음', '구토', '오심', '발열', '손발저림', '두통', '어지러움', '설사', '변비', '탈모', '발진', '가려움', '근육통'];
  const bowelConditionOptions = ['정상', '설사', '변비', '묽은변', '딱딱한변', '혈변'];

  // Bottom sheet options
  const chemoCycleOptions = [
    { value: '1차', label: '1차' },
    { value: '2차', label: '2차' },
    { value: '3차', label: '3차' },
    { value: '4차', label: '4차' },
    { value: '5차', label: '5차' }
  ];

  const chemoSessionOptions = [
    { value: '1회차', label: '1회차' },
    { value: '2회차', label: '2회차' },
    { value: '3회차', label: '3회차' },
    { value: '4회차', label: '4회차' },
    { value: '5회차', label: '5회차' },
    { value: '6회차', label: '6회차' }
  ];

  const chemoDayOptions = Array.from({ length: 21 }, (_, i) => ({
    value: `${i + 1}일차`,
    label: `${i + 1}일차`
  }));

  const foodIntakeLevelOptions = [
    { value: '전혀못먹음', label: '전혀못먹음' },
    { value: '평소의1/4정도', label: '평소의1/4정도' },
    { value: '평소의절반정도', label: '평소의절반정도' },
    { value: '평소의3/4정도', label: '평소의3/4정도' },
    { value: '평소와같음', label: '평소와같음' }
  ];

  const waterIntakeAmountOptions = [
    { value: '500', label: '500ml 이하' },
    { value: '1000', label: '500ml ~ 1L' },
    { value: '1500', label: '1L ~ 1.5L' },
    { value: '2000', label: '1.5L ~ 2L' },
    { value: '2500', label: '2L 이상' }
  ];

  const exerciseTimeOptions = [
    { value: '0', label: '0보' },
    { value: '500', label: '1천보 미만' },
    { value: '1500', label: '1천 ~ 2천보' },
    { value: '2500', label: '2천 ~ 3천보' },
    { value: '3500', label: '3천 ~ 4천보' },
    { value: '5000', label: '4천보 이상' }
  ];

  // 회차별 색상 클래스 생성 (차수와 회차 조합)
  const getSessionColorClass = (cycle, session) => {
    // "1차", "1회차" 형식으로 조합
    return `session-${cycle}-${session}`;
  };

  useEffect(() => {
    loadSymptomRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSymptomRecords = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/symptomRecords`));
      const records = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        records[data.date] = {
          id: doc.id,
          ...data
        };
      });
      setSymptomRecords(records);
    } catch (error) {
      console.error('증상 기록 로드 오류:', error);
    }
  };

  const handleDateClick = (selectedDate) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setDate(selectedDate);

    if (symptomRecords[dateStr]) {
      setSelectedDateRecord(symptomRecords[dateStr]);
      setShowForm(false);
    } else {
      setSelectedDateRecord(null);
      setShowForm(false);
    }
  };

  const handleCreateOrEdit = () => {
    const dateStr = format(date, 'yyyy-MM-dd');

    if (selectedDateRecord) {
      setFormData(selectedDateRecord);
    } else {
      setFormData({
        date: dateStr,
        chemoCycle: '',
        chemoSession: '',
        chemoDay: '',
        foodIntakeLevel: '',
        foodIntakeNote: '',
        waterIntakeAmount: '',
        waterIntakeNote: '',
        exerciseTime: '',
        exerciseNote: '',
        bowelMovement: '',
        bowelCondition: [],
        sideEffects: [],
        symptoms: ''
      });
    }
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;

    if (name === 'sideEffects') {
      let newSideEffects;

      if (value === '없음') {
        // If checking "없음", clear all other options
        newSideEffects = checked ? ['없음'] : [];
      } else {
        // If checking any other option, remove "없음" if it exists
        newSideEffects = checked
          ? [...formData.sideEffects.filter(item => item !== '없음'), value]
          : formData.sideEffects.filter(item => item !== value);
      }

      setFormData(prev => ({
        ...prev,
        sideEffects: newSideEffects
      }));

      if (errors.sideEffects) {
        setErrors(prev => ({
          ...prev,
          sideEffects: ''
        }));
      }
    } else if (name === 'bowelCondition') {
      setFormData(prev => ({
        ...prev,
        bowelCondition: checked
          ? [...prev.bowelCondition, value]
          : prev.bowelCondition.filter(item => item !== value)
      }));

      if (errors.bowelCondition) {
        setErrors(prev => ({
          ...prev,
          bowelCondition: ''
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = '날짜를 선택해주세요.';
    }

    if (!formData.chemoCycle) {
      newErrors.chemoCycle = '항암 진행 횟수를 선택해주세요.';
    }

    if (!formData.chemoSession) {
      newErrors.chemoSession = '항암 회차를 선택해주세요.';
    }

    if (!formData.chemoDay) {
      newErrors.chemoDay = '항암 진행 일차를 선택해주세요.';
    }

    if (!formData.foodIntakeLevel) {
      newErrors.foodIntakeLevel = '식사량을 선택해주세요.';
    }

    if (formData.foodIntakeNote.length > 500) {
      newErrors.foodIntakeNote = '식사량 메모는 500자 이내로 입력해주세요.';
    }

    if (!formData.waterIntakeAmount) {
      newErrors.waterIntakeAmount = '음수량을 선택해주세요.';
    }

    if (formData.waterIntakeNote.length > 500) {
      newErrors.waterIntakeNote = '음수량 메모는 500자 이내로 입력해주세요.';
    }

    if (!formData.exerciseTime) {
      newErrors.exerciseTime = '운동량을 선택해주세요.';
    }

    if (formData.exerciseNote.length > 500) {
      newErrors.exerciseNote = '운동량 메모는 500자 이내로 입력해주세요.';
    }

    if (!formData.bowelMovement) {
      newErrors.bowelMovement = '배변 유무를 선택해주세요.';
    }

    if (formData.bowelMovement === 'yes' && formData.bowelCondition.length === 0) {
      newErrors.bowelCondition = '배변 상태를 1개 이상 선택해주세요.';
    }

    if (formData.sideEffects.length === 0) {
      newErrors.sideEffects = '주요 부작용을 1개 이상 선택해주세요.';
    }

    if (formData.symptoms.length > 5000) {
      newErrors.symptoms = '주요 증상은 5000자 이내로 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const symptomRecordsPath = `users/${userId}/symptomRecords`;
      if (selectedDateRecord && selectedDateRecord.id) {
        await updateDoc(doc(db, symptomRecordsPath, selectedDateRecord.id), formData);
        alert('기록이 수정되었습니다.');
      } else {
        await addDoc(collection(db, symptomRecordsPath), formData);
        alert('기록이 등록되었습니다.');
      }
      setShowForm(false);
      loadSymptomRecords();
    } catch (error) {
      console.error('기록 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!selectedDateRecord || !selectedDateRecord.id) return;

    if (window.confirm('이 날짜의 기록을 삭제하시겠습니까?')) {
      try {
        const symptomRecordsPath = `users/${userId}/symptomRecords`;
        await deleteDoc(doc(db, symptomRecordsPath, selectedDateRecord.id));
        alert('기록이 삭제되었습니다.');
        setSelectedDateRecord(null);
        setShowForm(false);
        loadSymptomRecords();
      } catch (error) {
        console.error('기록 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = format(date, 'yyyy-MM-dd');
      const record = symptomRecords[dateStr];

      if (record) {
        // 증상 배열 처리 (최대 6개까지만)
        const sideEffectsToShow = record.sideEffects && record.sideEffects.length > 0 && record.sideEffects[0] !== '없음'
          ? record.sideEffects.slice(0, 6)
          : [];

        // 차-회-일 형식으로 변환 (예: "1차", "1회차", "1일차" -> "1-1-1")
        const cycleNum = record.chemoCycle ? record.chemoCycle.replace('차', '') : '';
        const sessionNum = record.chemoSession ? record.chemoSession.replace('회차', '') : '';
        const dayNum = record.chemoDay ? record.chemoDay.replace('일차', '') : '';
        const badgeText = `${cycleNum}-${sessionNum}-${dayNum}`;

        return (
          <div className="tile-content">
            <div className="red-dot"></div>
            {/* 회차 정보 뱃지 - 단일 뱃지로 표시 */}
            {record.chemoCycle && record.chemoSession && record.chemoDay && (
              <div className="session-badge-container">
                <span className={`badge session-badge ${getSessionColorClass(record.chemoCycle, record.chemoSession)}`}>
                  {badgeText}
                </span>
              </div>
            )}
            {/* 증상 뱃지들 */}
            {sideEffectsToShow.length > 0 && (
              <div className="side-effects-badges">
                {sideEffectsToShow.map((effect, index) => (
                  <span key={index} className="badge symptom-badge">
                    {effect}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="daily-symptom-calendar">
      <h2>일일 항암 증상 기록 캘린더</h2>

      <div className="calendar-container">
        <Calendar
          onChange={handleDateClick}
          value={date}
          tileContent={tileContent}
          locale="ko-KR"
        />
      </div>

      <div className="selected-date-info">
        <h3>{format(date, 'yyyy년 MM월 dd일')}</h3>

        {!showForm && (
          <>
            {selectedDateRecord ? (
              <div className="record-view">
                <div className="record-item">
                  <strong>항암 진행 횟수:</strong> {selectedDateRecord.chemoCycle}
                </div>
                <div className="record-item">
                  <strong>항암 회차:</strong> {selectedDateRecord.chemoSession}
                </div>
                <div className="record-item">
                  <strong>항암 진행 일차:</strong> {selectedDateRecord.chemoDay}
                </div>
                <div className="record-item">
                  <strong>식사량:</strong> {(() => {
                    const level = selectedDateRecord.foodIntakeLevel || selectedDateRecord.foodIntake;
                    // 숫자 값을 텍스트로 변환
                    const foodIntakeMap = {
                      '0': '전혀못먹음',
                      '25': '평소의1/4정도',
                      '50': '평소의절반정도',
                      '75': '평소의3/4정도',
                      '100': '평소와같음'
                    };
                    return foodIntakeMap[level] || level;
                  })()}
                  {selectedDateRecord.foodIntakeNote && <div className="record-note">{selectedDateRecord.foodIntakeNote}</div>}
                </div>
                <div className="record-item">
                  <strong>음수량:</strong> {selectedDateRecord.waterIntakeAmount ? `약 ${selectedDateRecord.waterIntakeAmount}ml` : selectedDateRecord.waterIntake}
                  {selectedDateRecord.waterIntakeNote && <div className="record-note">{selectedDateRecord.waterIntakeNote}</div>}
                </div>
                <div className="record-item">
                  <strong>운동량:</strong> {selectedDateRecord.exerciseTime ? `약 ${selectedDateRecord.exerciseTime}보` : selectedDateRecord.exercise}
                  {selectedDateRecord.exerciseNote && <div className="record-note">{selectedDateRecord.exerciseNote}</div>}
                </div>
                <div className="record-item">
                  <strong>배변:</strong> {selectedDateRecord.bowelMovement === 'yes' ? '있음' : selectedDateRecord.bowelMovement === 'no' ? '없음' : '-'}
                  {selectedDateRecord.bowelMovement === 'yes' && selectedDateRecord.bowelCondition && selectedDateRecord.bowelCondition.length > 0 && (
                    <div className="record-note">상태: {selectedDateRecord.bowelCondition.join(', ')}</div>
                  )}
                </div>
                <div className="record-item">
                  <strong>주요 부작용:</strong> {selectedDateRecord.sideEffects.join(', ')}
                </div>
                <div className="record-item">
                  <div><strong>주요 증상:</strong></div>
                  <div className="symptoms-text">{selectedDateRecord.symptoms}</div>
                </div>
                <div className="button-group">
                  <button className="edit-button" onClick={handleCreateOrEdit}>
                    수정하기
                  </button>
                  <button className="delete-button" onClick={handleDelete}>
                    삭제하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-record">
                <p>입력된 내용이 없습니다.</p>
                <button className="create-button" onClick={handleCreateOrEdit}>
                  작성하기
                </button>
              </div>
            )}
          </>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="symptom-form">
            <div className="form-group">
              <label htmlFor="date">날짜 <span className="required">*</span></label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={errors.date ? 'error' : ''}
              />
              {errors.date && <span className="error-message">{errors.date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="chemoCycle">항암 진행 횟수 <span className="required">*</span></label>
              <button
                type="button"
                className={`bottom-sheet-trigger ${errors.chemoCycle ? 'error' : ''}`}
                onClick={() => setActiveBottomSheet('chemoCycle')}
                style={{ padding: '4px 8px', lineHeight: '1.2', minHeight: 'auto', height: 'auto' }}
              >
                <span className={formData.chemoCycle ? 'selected' : 'placeholder'}>
                  {formData.chemoCycle || '선택해주세요'}
                </span>
                <span className="arrow">▼</span>
              </button>
              {errors.chemoCycle && <span className="error-message">{errors.chemoCycle}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="chemoSession">항암 회차 <span className="required">*</span></label>
              <button
                type="button"
                className={`bottom-sheet-trigger ${errors.chemoSession ? 'error' : ''}`}
                onClick={() => setActiveBottomSheet('chemoSession')}
                style={{ padding: '4px 8px', lineHeight: '1.2', minHeight: 'auto', height: 'auto' }}
              >
                <span className={formData.chemoSession ? 'selected' : 'placeholder'}>
                  {formData.chemoSession || '선택해주세요'}
                </span>
                <span className="arrow">▼</span>
              </button>
              {errors.chemoSession && <span className="error-message">{errors.chemoSession}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="chemoDay">항암 진행 일차 <span className="required">*</span></label>
              <button
                type="button"
                className={`bottom-sheet-trigger ${errors.chemoDay ? 'error' : ''}`}
                onClick={() => setActiveBottomSheet('chemoDay')}
                style={{ padding: '4px 8px', lineHeight: '1.2', minHeight: 'auto', height: 'auto' }}
              >
                <span className={formData.chemoDay ? 'selected' : 'placeholder'}>
                  {formData.chemoDay || '선택해주세요'}
                </span>
                <span className="arrow">▼</span>
              </button>
              {errors.chemoDay && <span className="error-message">{errors.chemoDay}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="foodIntakeLevel">식사량 <span className="required">*</span></label>
              <button
                type="button"
                className={`bottom-sheet-trigger ${errors.foodIntakeLevel ? 'error' : ''}`}
                onClick={() => setActiveBottomSheet('foodIntakeLevel')}
                style={{ padding: '4px 8px', lineHeight: '1.2', minHeight: 'auto', height: 'auto' }}
              >
                <span className={formData.foodIntakeLevel ? 'selected' : 'placeholder'}>
                  {formData.foodIntakeLevel || '선택해주세요'}
                </span>
                <span className="arrow">▼</span>
              </button>
              {errors.foodIntakeLevel && <span className="error-message">{errors.foodIntakeLevel}</span>}

              <label htmlFor="foodIntakeNote" style={{marginTop: '10px', display: 'block'}}>식사량 메모 (선택)</label>
              <textarea
                id="foodIntakeNote"
                name="foodIntakeNote"
                value={formData.foodIntakeNote}
                onChange={handleChange}
                rows="2"
                maxLength="500"
                placeholder="어떤 음식을 먹었는지, 특이사항 등을 자유롭게 입력해주세요"
                className={errors.foodIntakeNote ? 'error' : ''}
              />
              <span className="char-count">{formData.foodIntakeNote.length}/500</span>
              {errors.foodIntakeNote && <span className="error-message">{errors.foodIntakeNote}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="waterIntakeAmount">음수량 <span className="required">*</span></label>
              <button
                type="button"
                className={`bottom-sheet-trigger ${errors.waterIntakeAmount ? 'error' : ''}`}
                onClick={() => setActiveBottomSheet('waterIntakeAmount')}
                style={{ padding: '4px 8px', lineHeight: '1.2', minHeight: 'auto', height: 'auto' }}
              >
                <span className={formData.waterIntakeAmount ? 'selected' : 'placeholder'}>
                  {formData.waterIntakeAmount ? waterIntakeAmountOptions.find(opt => opt.value === formData.waterIntakeAmount)?.label : '선택해주세요'}
                </span>
                <span className="arrow">▼</span>
              </button>
              {errors.waterIntakeAmount && <span className="error-message">{errors.waterIntakeAmount}</span>}

              <label htmlFor="waterIntakeNote" style={{marginTop: '10px', display: 'block'}}>음수량 메모 (선택)</label>
              <textarea
                id="waterIntakeNote"
                name="waterIntakeNote"
                value={formData.waterIntakeNote}
                onChange={handleChange}
                rows="2"
                maxLength="500"
                placeholder="물 외에 다른 음료를 마셨거나 특이사항이 있다면 입력해주세요"
                className={errors.waterIntakeNote ? 'error' : ''}
              />
              <span className="char-count">{formData.waterIntakeNote.length}/500</span>
              {errors.waterIntakeNote && <span className="error-message">{errors.waterIntakeNote}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="exerciseTime">운동량 (걸음수) <span className="required">*</span></label>
              <button
                type="button"
                className={`bottom-sheet-trigger ${errors.exerciseTime ? 'error' : ''}`}
                onClick={() => setActiveBottomSheet('exerciseTime')}
                style={{ padding: '4px 8px', lineHeight: '1.2', minHeight: 'auto', height: 'auto' }}
              >
                <span className={formData.exerciseTime ? 'selected' : 'placeholder'}>
                  {formData.exerciseTime ? exerciseTimeOptions.find(opt => opt.value === formData.exerciseTime)?.label : '선택해주세요'}
                </span>
                <span className="arrow">▼</span>
              </button>
              {errors.exerciseTime && <span className="error-message">{errors.exerciseTime}</span>}

              <label htmlFor="exerciseNote" style={{marginTop: '10px', display: 'block'}}>운동량 메모 (선택)</label>
              <textarea
                id="exerciseNote"
                name="exerciseNote"
                value={formData.exerciseNote}
                onChange={handleChange}
                rows="2"
                maxLength="500"
                placeholder="어떤 운동을 했는지, 강도나 특이사항을 입력해주세요"
                className={errors.exerciseNote ? 'error' : ''}
              />
              <span className="char-count">{formData.exerciseNote.length}/500</span>
              {errors.exerciseNote && <span className="error-message">{errors.exerciseNote}</span>}
            </div>

            <div className="form-group">
              <label>배변 유무 <span className="required">*</span></label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="bowelMovement"
                    value="yes"
                    checked={formData.bowelMovement === 'yes'}
                    onChange={handleChange}
                  />
                  있음
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="bowelMovement"
                    value="no"
                    checked={formData.bowelMovement === 'no'}
                    onChange={handleChange}
                  />
                  없음
                </label>
              </div>
              {errors.bowelMovement && <span className="error-message">{errors.bowelMovement}</span>}
            </div>

            {formData.bowelMovement === 'yes' && (
              <div className="form-group">
                <label>배변 상태 <span className="required">*</span></label>
                <div className="checkbox-group">
                  {bowelConditionOptions.map(option => (
                    <label key={option} className="checkbox-label">
                      <input
                        type="checkbox"
                        name="bowelCondition"
                        value={option}
                        checked={formData.bowelCondition.includes(option)}
                        onChange={handleCheckboxChange}
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {errors.bowelCondition && <span className="error-message">{errors.bowelCondition}</span>}
              </div>
            )}

            <div className="form-group">
              <label>주요 부작용 <span className="required">*</span></label>
              <div className="checkbox-group">
                {sideEffectOptions.map(option => (
                  <label key={option} className="checkbox-label">
                    <input
                      type="checkbox"
                      name="sideEffects"
                      value={option}
                      checked={formData.sideEffects.includes(option)}
                      onChange={handleCheckboxChange}
                      disabled={option !== '없음' && formData.sideEffects.includes('없음')}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {errors.sideEffects && <span className="error-message">{errors.sideEffects}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="symptoms">주요 증상 <span className="required">*</span></label>
              <textarea
                id="symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                rows="5"
                maxLength="5000"
                placeholder="작성된 내용을 참고하여 AI분석을 진행합니다. 기록하고싶은 내용을 자세히 작성해주세요"
                className={errors.symptoms ? 'error' : ''}
              />
              <span className="char-count">{formData.symptoms.length}/5000</span>
              {errors.symptoms && <span className="error-message">{errors.symptoms}</span>}
            </div>

            <div className="form-buttons">
              <button type="submit" className="submit-button">등록하기</button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowForm(false);
                  setErrors({});
                }}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bottom Sheets */}
      <BottomSheet
        isOpen={activeBottomSheet === 'chemoCycle'}
        onClose={() => setActiveBottomSheet(null)}
        title="항암 진행 횟수"
        options={chemoCycleOptions}
        value={formData.chemoCycle}
        onSelect={(value) => {
          setFormData(prev => ({ ...prev, chemoCycle: value }));
          if (errors.chemoCycle) {
            setErrors(prev => ({ ...prev, chemoCycle: '' }));
          }
        }}
      />

      <BottomSheet
        isOpen={activeBottomSheet === 'chemoSession'}
        onClose={() => setActiveBottomSheet(null)}
        title="항암 회차"
        options={chemoSessionOptions}
        value={formData.chemoSession}
        onSelect={(value) => {
          setFormData(prev => ({ ...prev, chemoSession: value }));
          if (errors.chemoSession) {
            setErrors(prev => ({ ...prev, chemoSession: '' }));
          }
        }}
      />

      <BottomSheet
        isOpen={activeBottomSheet === 'chemoDay'}
        onClose={() => setActiveBottomSheet(null)}
        title="항암 진행 일차"
        options={chemoDayOptions}
        value={formData.chemoDay}
        onSelect={(value) => {
          setFormData(prev => ({ ...prev, chemoDay: value }));
          if (errors.chemoDay) {
            setErrors(prev => ({ ...prev, chemoDay: '' }));
          }
        }}
      />

      <BottomSheet
        isOpen={activeBottomSheet === 'foodIntakeLevel'}
        onClose={() => setActiveBottomSheet(null)}
        title="식사량"
        options={foodIntakeLevelOptions}
        value={formData.foodIntakeLevel}
        onSelect={(value) => {
          setFormData(prev => ({ ...prev, foodIntakeLevel: value }));
          if (errors.foodIntakeLevel) {
            setErrors(prev => ({ ...prev, foodIntakeLevel: '' }));
          }
        }}
      />

      <BottomSheet
        isOpen={activeBottomSheet === 'waterIntakeAmount'}
        onClose={() => setActiveBottomSheet(null)}
        title="음수량"
        options={waterIntakeAmountOptions}
        value={formData.waterIntakeAmount}
        onSelect={(value) => {
          setFormData(prev => ({ ...prev, waterIntakeAmount: value }));
          if (errors.waterIntakeAmount) {
            setErrors(prev => ({ ...prev, waterIntakeAmount: '' }));
          }
        }}
      />

      <BottomSheet
        isOpen={activeBottomSheet === 'exerciseTime'}
        onClose={() => setActiveBottomSheet(null)}
        title="운동량 (걸음수)"
        options={exerciseTimeOptions}
        value={formData.exerciseTime}
        onSelect={(value) => {
          setFormData(prev => ({ ...prev, exerciseTime: value }));
          if (errors.exerciseTime) {
            setErrors(prev => ({ ...prev, exerciseTime: '' }));
          }
        }}
      />
    </div>
  );
}

export default DailySymptomCalendar;
