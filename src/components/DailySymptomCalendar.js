import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import '../styles/DailySymptomCalendar.css';

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

  const sideEffectOptions = ['없음', '구토', '오심', '발열', '손발저림', '두통', '설사', '변비', '탈모', '발진', '가려움', '근육통'];
  const bowelConditionOptions = ['정상', '설사', '변비', '묽은변', '딱딱한변', '혈변'];

  // 회차별 색상 클래스 생성 (차수와 회차 조합)
  const getSessionColorClass = (cycle, session) => {
    // "1차", "1회차" 형식으로 조합
    return `session-${cycle}-${session}`;
  };

  useEffect(() => {
    loadSymptomRecords();
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
      setFormData(prev => ({
        ...prev,
        sideEffects: checked
          ? [...prev.sideEffects, value]
          : prev.sideEffects.filter(item => item !== value)
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

    if (!formData.chemoCycle.trim() || formData.chemoCycle.length > 10) {
      newErrors.chemoCycle = '항암 진행 횟수를 10자 이내로 입력해주세요.';
    }

    if (!formData.chemoSession.trim() || formData.chemoSession.length > 10) {
      newErrors.chemoSession = '항암 회차를 10자 이내로 입력해주세요.';
    }

    if (!formData.chemoDay.trim() || formData.chemoDay.length > 10) {
      newErrors.chemoDay = '항암 진행 일차를 10자 이내로 입력해주세요.';
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

        return (
          <div className="tile-content">
            <div className="red-dot"></div>
            {/* 회차 정보 뱃지 */}
            {record.chemoCycle && record.chemoSession && record.chemoDay && (
              <div className="session-badge-container">
                <span className={`badge session-badge ${getSessionColorClass(record.chemoCycle, record.chemoSession)}`}>
                  {record.chemoCycle} - {record.chemoSession} - {record.chemoDay}
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
      <h2>일일 증상 기록 캘린더</h2>

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
                  <strong>식사량:</strong> {selectedDateRecord.foodIntakeLevel ? `${selectedDateRecord.foodIntakeLevel}%` : selectedDateRecord.foodIntake}
                  {selectedDateRecord.foodIntakeNote && <div style={{marginTop: '5px', color: '#7f8c8d'}}>{selectedDateRecord.foodIntakeNote}</div>}
                </div>
                <div className="record-item">
                  <strong>음수량:</strong> {selectedDateRecord.waterIntakeAmount ? `약 ${selectedDateRecord.waterIntakeAmount}ml` : selectedDateRecord.waterIntake}
                  {selectedDateRecord.waterIntakeNote && <div style={{marginTop: '5px', color: '#7f8c8d'}}>{selectedDateRecord.waterIntakeNote}</div>}
                </div>
                <div className="record-item">
                  <strong>운동량:</strong> {selectedDateRecord.exerciseTime ? `약 ${selectedDateRecord.exerciseTime}보` : selectedDateRecord.exercise}
                  {selectedDateRecord.exerciseNote && <div style={{marginTop: '5px', color: '#7f8c8d'}}>{selectedDateRecord.exerciseNote}</div>}
                </div>
                <div className="record-item">
                  <strong>배변:</strong> {selectedDateRecord.bowelMovement === 'yes' ? '있음' : selectedDateRecord.bowelMovement === 'no' ? '없음' : '-'}
                  {selectedDateRecord.bowelMovement === 'yes' && selectedDateRecord.bowelCondition && selectedDateRecord.bowelCondition.length > 0 && (
                    <div style={{marginTop: '5px', color: '#7f8c8d'}}>상태: {selectedDateRecord.bowelCondition.join(', ')}</div>
                  )}
                </div>
                <div className="record-item">
                  <strong>주요 부작용:</strong> {selectedDateRecord.sideEffects.join(', ')}
                </div>
                <div className="record-item">
                  <strong>주요 증상:</strong>
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
              <input
                type="text"
                id="chemoCycle"
                name="chemoCycle"
                value={formData.chemoCycle}
                onChange={handleChange}
                placeholder="몇 번째 항암인지 써주세요 ex.1차/2차.."
                maxLength="10"
                className={errors.chemoCycle ? 'error' : ''}
              />
              {errors.chemoCycle && <span className="error-message">{errors.chemoCycle}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="chemoSession">항암 회차 <span className="required">*</span></label>
              <input
                type="text"
                id="chemoSession"
                name="chemoSession"
                value={formData.chemoSession}
                onChange={handleChange}
                placeholder="동일 차수 내에서 몇 번째인지 써주세요 ex.1회차/2회차.."
                maxLength="10"
                className={errors.chemoSession ? 'error' : ''}
              />
              {errors.chemoSession && <span className="error-message">{errors.chemoSession}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="chemoDay">항암 진행 일차 <span className="required">*</span></label>
              <input
                type="text"
                id="chemoDay"
                name="chemoDay"
                value={formData.chemoDay}
                onChange={handleChange}
                placeholder="동일 회차 내에서 며칠 차인지 써주세요 ex.3일차"
                maxLength="10"
                className={errors.chemoDay ? 'error' : ''}
              />
              {errors.chemoDay && <span className="error-message">{errors.chemoDay}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="foodIntakeLevel">식사량 <span className="required">*</span></label>
              <select
                id="foodIntakeLevel"
                name="foodIntakeLevel"
                value={formData.foodIntakeLevel}
                onChange={handleChange}
                className={errors.foodIntakeLevel ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                <option value="0">0% (전혀 못 먹음)</option>
                <option value="25">25% (평소의 1/4 정도)</option>
                <option value="50">50% (평소의 절반 정도)</option>
                <option value="75">75% (평소의 3/4 정도)</option>
                <option value="100">100% (평소와 같음)</option>
              </select>
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
              <select
                id="waterIntakeAmount"
                name="waterIntakeAmount"
                value={formData.waterIntakeAmount}
                onChange={handleChange}
                className={errors.waterIntakeAmount ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                <option value="500">500ml 이하</option>
                <option value="1000">500ml ~ 1L</option>
                <option value="1500">1L ~ 1.5L</option>
                <option value="2000">1.5L ~ 2L</option>
                <option value="2500">2L 이상</option>
              </select>
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
              <select
                id="exerciseTime"
                name="exerciseTime"
                value={formData.exerciseTime}
                onChange={handleChange}
                className={errors.exerciseTime ? 'error' : ''}
              >
                <option value="">선택해주세요</option>
                <option value="0">0보</option>
                <option value="500">1천보 미만</option>
                <option value="1500">1천 ~ 2천보</option>
                <option value="2500">2천 ~ 3천보</option>
                <option value="3500">3천 ~ 4천보</option>
                <option value="5000">4천보 이상</option>
              </select>
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
    </div>
  );
}

export default DailySymptomCalendar;
