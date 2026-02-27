import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import '../styles/MedicationList.css';

function MedicationList({ userId }) {
  const [medications, setMedications] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    frequency: '',
    effect: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggedElement, setDraggedElement] = useState(null);

  useEffect(() => {
    loadMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadMedications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/medications`));
      const medicationList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // order 필드로 정렬, 없으면 마지막에 배치
      medicationList.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
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
      if (editingId) {
        // 수정 모드
        await updateDoc(doc(db, `users/${userId}/medications`, editingId), formData);
        alert('약물 정보가 수정되었습니다.');
      } else {
        // 등록 모드 - 새로운 약물은 마지막 순서로
        const dataWithOrder = {
          ...formData,
          order: medications.length
        };
        await addDoc(collection(db, `users/${userId}/medications`), dataWithOrder);
        alert('약물이 등록되었습니다.');
      }
      setFormData({
        name: '',
        frequency: '',
        effect: '',
        notes: ''
      });
      setShowForm(false);
      setEditingId(null);
      await loadMedications(); // 변경사항 즉시 반영
    } catch (error) {
      console.error('약물 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (medication) => {
    setEditingId(medication.id);
    setFormData({
      name: medication.name,
      frequency: medication.frequency,
      effect: medication.effect,
      notes: medication.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`"${name}" 약물을 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, `users/${userId}/medications`, id));
        alert('약물이 삭제되었습니다.');
        await loadMedications(); // 변경사항 즉시 반영
      } catch (error) {
        console.error('약물 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDragStart = (e, index) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    // 드래그 중인 카드의 부모 요소 찾기
    const card = e.currentTarget.closest('.medication-card');
    if (card) {
      setTimeout(() => {
        card.classList.add('dragging');
      }, 0);
    }
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newMedications = [...medications];
    const [draggedItem] = newMedications.splice(draggedIndex, 1);
    newMedications.splice(dropIndex, 0, draggedItem);

    // 순서 업데이트
    try {
      await Promise.all(newMedications.map((med, idx) =>
        updateDoc(doc(db, `users/${userId}/medications`, med.id), { order: idx })
      ));
      setDraggedIndex(null);
      setDragOverIndex(null);
      await loadMedications();
    } catch (error) {
      console.error('순서 변경 오류:', error);
      alert('순서 변경 중 오류가 발생했습니다.');
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleDragEnd = (e) => {
    e.stopPropagation();
    const card = e.currentTarget.closest('.medication-card');
    if (card) {
      card.classList.remove('dragging');
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 터치 이벤트 핸들러 (모바일용)
  const handleTouchStart = (e, index) => {
    e.stopPropagation();
    setDraggedIndex(index);

    const card = e.currentTarget.closest('.medication-card');
    if (card) {
      setDraggedElement(card);
      card.classList.add('dragging');
    }
  };

  const handleTouchMove = (e) => {
    if (draggedIndex === null || !draggedElement) return;

    e.preventDefault();
    const touch = e.touches[0];
    const currentY = touch.clientY;

    // 터치 위치에 있는 카드 찾기
    const cards = document.querySelectorAll('.medication-card');
    let overIndex = null;

    cards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      if (currentY >= rect.top && currentY <= rect.bottom && idx !== draggedIndex) {
        overIndex = idx;
      }
    });

    setDragOverIndex(overIndex);
  };

  const handleTouchEnd = async (e) => {
    e.stopPropagation();

    if (draggedElement) {
      draggedElement.classList.remove('dragging');
    }

    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newMedications = [...medications];
      const [draggedItem] = newMedications.splice(draggedIndex, 1);
      newMedications.splice(dragOverIndex, 0, draggedItem);

      try {
        await Promise.all(newMedications.map((med, idx) =>
          updateDoc(doc(db, `users/${userId}/medications`, med.id), { order: idx })
        ));
        await loadMedications();
      } catch (error) {
        console.error('순서 변경 오류:', error);
        alert('순서 변경 중 오류가 발생했습니다.');
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggedElement(null);
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
          <h3>{editingId ? '약물 수정' : '약물 등록'}</h3>

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
            <button type="submit" className="submit-button">
              {editingId ? '수정하기' : '등록하기'}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ name: '', frequency: '', effect: '', notes: '' });
                setErrors({});
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}

      <div className="medication-cards-container">
        {medications.length > 0 ? (
          medications.map((med, index) => (
            <div
              key={med.id}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`medication-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            >
              <div
                className="drag-handle"
                title="드래그하여 순서 변경"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="17" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="17" r="1.5" fill="currentColor"/>
                </svg>
              </div>

              <div className="card-content">
                <div className="card-row">
                  <label>약물 이름</label>
                  <span className="medication-name">{med.name}</span>
                </div>
                <div className="card-row">
                  <label>복용 횟수</label>
                  <span>{med.frequency}</span>
                </div>
                <div className="card-row">
                  <label>주요 효능</label>
                  <span>{med.effect}</span>
                </div>
                {med.notes && (
                  <div className="card-row">
                    <label>기타 내용</label>
                    <span>{med.notes}</span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={() => handleEdit(med)}
                >
                  수정
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(med.id, med.name)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>등록된 약물이 없습니다.</p>
            <p className="empty-subtitle">+ 약물 등록하기 버튼을 눌러 추가해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicationList;
