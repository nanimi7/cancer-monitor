import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import '../styles/MedicationList.css';

function MedicationList() {
  const [medications, setMedications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    frequency: '',
    effect: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'medications'));
      const medicationList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMedications(medicationList);
    } catch (error) {
      console.error('약물 데이터 로드 오류:', error);
    }
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '약물 이름을 입력해주세요.';
    }

    if (!formData.frequency.trim()) {
      newErrors.frequency = '복용 횟수를 입력해주세요.';
    }

    if (!formData.effect.trim()) {
      newErrors.effect = '주요 효능을 입력해주세요.';
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
      await addDoc(collection(db, 'medications'), formData);
      alert('약물이 등록되었습니다.');
      setFormData({
        name: '',
        frequency: '',
        effect: '',
        notes: ''
      });
      setShowForm(false);
      loadMedications();
    } catch (error) {
      console.error('약물 등록 오류:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`"${name}" 약물을 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'medications', id));
        alert('약물이 삭제되었습니다.');
        loadMedications();
      } catch (error) {
        console.error('약물 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="medication-list">
      <h2>처방받은 약 목록 관리</h2>

      {!showForm && (
        <button
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + 약물 등록하기
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="medication-form">
          <h3>약물 등록</h3>

          <div className="form-group">
            <label htmlFor="name">약물 이름 <span className="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="frequency">복용 횟수 <span className="required">*</span></label>
            <input
              type="text"
              id="frequency"
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              placeholder="예: 1일 3회"
              className={errors.frequency ? 'error' : ''}
            />
            {errors.frequency && <span className="error-message">{errors.frequency}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="effect">주요 효능 <span className="required">*</span></label>
            <input
              type="text"
              id="effect"
              name="effect"
              value={formData.effect}
              onChange={handleChange}
              className={errors.effect ? 'error' : ''}
            />
            {errors.effect && <span className="error-message">{errors.effect}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="notes">기타 내용</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="submit-button">등록하기</button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', frequency: '', effect: '', notes: '' });
                setErrors({});
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}

      <div className="medication-table-container">
        {medications.length > 0 ? (
          <table className="medication-table">
            <thead>
              <tr>
                <th>약물 이름</th>
                <th>복용 횟수</th>
                <th>주요 효능</th>
                <th>기타 내용</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {medications.map(med => (
                <tr key={med.id}>
                  <td>{med.name}</td>
                  <td>{med.frequency}</td>
                  <td>{med.effect}</td>
                  <td>{med.notes || '-'}</td>
                  <td>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(med.id, med.name)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-message">등록된 약물이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export default MedicationList;
