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
  const [touchStartY, setTouchStartY] = useState(null);

  useEffect(() => {
    loadMedications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      loadMedications();
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
        loadMedications();
      } catch (error) {
        console.error('약물 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
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
      loadMedications();
    } catch (error) {
      console.error('순서 변경 오류:', error);
      alert('순서 변경 중 오류가 발생했습니다.');
      setDraggedIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleTouchStart = (e, index) => {
    setDraggedIndex(index);
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (draggedIndex === null || touchStartY === null) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const diff = currentY - touchStartY;

    // 위아래로 일정 거리 이상 움직였을 때만 처리
    if (Math.abs(diff) < 50) return;

    e.preventDefault();
  };

  const handleTouchEnd = async (e, dropIndex) => {
    if (draggedIndex === null || touchStartY === null) {
      setDraggedIndex(null);
      setTouchStartY(null);
      return;
    }

    const touch = e.changedTouches[0];
    const currentY = touch.clientY;
    const diff = currentY - touchStartY;

    let newIndex = draggedIndex;

    // 위로 스와이프 (위로 이동)
    if (diff < -50 && draggedIndex > 0) {
      newIndex = draggedIndex - 1;
    }
    // 아래로 스와이프 (아래로 이동)
    else if (diff > 50 && draggedIndex < medications.length - 1) {
      newIndex = draggedIndex + 1;
    }

    if (newIndex !== draggedIndex) {
      const newMedications = [...medications];
      const [draggedItem] = newMedications.splice(draggedIndex, 1);
      newMedications.splice(newIndex, 0, draggedItem);

      try {
        await Promise.all(newMedications.map((med, idx) =>
          updateDoc(doc(db, `users/${userId}/medications`, med.id), { order: idx })
        ));
        loadMedications();
      } catch (error) {
        console.error('순서 변경 오류:', error);
        alert('순서 변경 중 오류가 발생했습니다.');
      }
    }

    setDraggedIndex(null);
    setTouchStartY(null);
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

      <div className="medication-table-container">
        {medications.length > 0 ? (
          <table className="medication-table">
            <thead>
              <tr>
                <th>순서</th>
                <th>약물 이름</th>
                <th>복용 횟수</th>
                <th>주요 효능</th>
                <th>기타 내용</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med, index) => (
                <tr
                  key={med.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => handleTouchEnd(e, index)}
                  className={draggedIndex === index ? 'dragging' : ''}
                  style={{ cursor: 'move' }}
                >
                  <td className="drag-handle-cell">
                    <div className="drag-handle" title="드래그하여 순서 변경">
                      ⋮⋮
                    </div>
                  </td>
                  <td data-label="약물 이름">{med.name}</td>
                  <td data-label="복용 횟수">{med.frequency}</td>
                  <td data-label="주요 효능">{med.effect}</td>
                  <td data-label="기타 내용">{med.notes || '-'}</td>
                  <td data-label="관리">
                    <div className="action-buttons">
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(med)}
                      >
                        수정
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(med.id, med.name)}
                      >
                        삭제
                      </button>
                    </div>
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
