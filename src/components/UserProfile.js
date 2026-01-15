import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import '../styles/UserProfile.css';

function UserProfile({ userId }) {
  const [formData, setFormData] = useState({
    nickname: '',
    birthdate: '',
    gender: '',
    disease: '',
    underlyingConditions: '',
    otherInfo: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/profile`));
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUserId(querySnapshot.docs[0].id);
        // 기존 데이터에 otherInfo가 없을 수 있으므로 기본값 설정
        setFormData({
          nickname: userData.nickname || '',
          birthdate: userData.birthdate || '',
          gender: userData.gender || '',
          disease: userData.disease || '',
          underlyingConditions: userData.underlyingConditions || '',
          otherInfo: userData.otherInfo || ''
        });
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 오류:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 입력 시 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    } else if (formData.nickname.length > 10) {
      newErrors.nickname = '닉네임은 10자 이내로 입력해주세요.';
    }

    if (!formData.birthdate) {
      newErrors.birthdate = '생년월일을 선택해주세요.';
    }

    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요.';
    }

    if (!formData.disease.trim()) {
      newErrors.disease = '병명을 입력해주세요.';
    }

    if (formData.underlyingConditions.length > 1000) {
      newErrors.underlyingConditions = '기저질환 정보는 1000자 이내로 입력해주세요.';
    }

    if (formData.otherInfo.length > 1000) {
      newErrors.otherInfo = '기타 정보는 1000자 이내로 입력해주세요.';
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
      const userProfilePath = `users/${userId}/profile`;
      if (isEditing && userId) {
        await updateDoc(doc(db, userProfilePath, userId), formData);
        alert('사용자 정보가 수정되었습니다.');
        setShowEditForm(false);
      } else {
        const docRef = await addDoc(collection(db, userProfilePath), formData);
        setUserId(docRef.id);
        setIsEditing(true);
        alert('사용자 정보가 등록되었습니다.');
      }
    } catch (error) {
      console.error('데이터 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleEditClick = () => {
    setShowEditForm(true);
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    // 원래 데이터로 복원하기 위해 다시 로드
    loadUserData();
    setErrors({});
  };

  // 성별에 따른 캐릭터 이미지 선택 (젊은 성인으로 통일)
  const getCharacterImage = (gender) => {
    // 남성 캐릭터 (젊은 남성)
    if (gender === '남') {
      return '👨';
    }

    // 여성 캐릭터 (젊은 여성)
    if (gender === '여') {
      return '👩';
    }

    return '😊'; // 기본값
  };

  return (
    <div className="user-profile">
      <h2>사용자 정보</h2>

      {isEditing && !showEditForm ? (
        // 등록된 정보가 있고 수정 모드가 아닐 때 - 정보 표시
        <div className="user-info-display">
          <div className="profile-header">
            <div className="character-avatar">
              {getCharacterImage(formData.gender)}
            </div>
            <div className="profile-info">
              <h3 className="profile-nickname">{formData.nickname}</h3>
              <p className="profile-details">
                {formData.birthdate} | {formData.gender} | {formData.disease}
              </p>
            </div>
          </div>
          <button onClick={handleEditClick} className="edit-button">
            수정
          </button>
        </div>
      ) : (
        // 등록된 정보가 없거나 수정 모드일 때 - 등록/수정 화면
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nickname">닉네임 <span className="required">*</span></label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              maxLength="10"
              className={errors.nickname ? 'error' : ''}
            />
            {errors.nickname && <span className="error-message">{errors.nickname}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="birthdate">생년월일 <span className="required">*</span></label>
            <input
              type="date"
              id="birthdate"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleChange}
              className={errors.birthdate ? 'error' : ''}
            />
            {errors.birthdate && <span className="error-message">{errors.birthdate}</span>}
          </div>

          <div className="form-group">
            <label>성별 <span className="required">*</span></label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="남"
                  checked={formData.gender === '남'}
                  onChange={handleChange}
                />
                남
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="여"
                  checked={formData.gender === '여'}
                  onChange={handleChange}
                />
                여
              </label>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="disease">병명 <span className="required">*</span></label>
            <input
              type="text"
              id="disease"
              name="disease"
              value={formData.disease}
              onChange={handleChange}
              className={errors.disease ? 'error' : ''}
            />
            {errors.disease && <span className="error-message">{errors.disease}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="underlyingConditions">기저질환 정보</label>
            <textarea
              id="underlyingConditions"
              name="underlyingConditions"
              value={formData.underlyingConditions}
              onChange={handleChange}
              maxLength="1000"
              rows="4"
              className={errors.underlyingConditions ? 'error' : ''}
            />
            <span className="char-count">{formData.underlyingConditions.length}/1000</span>
            {errors.underlyingConditions && <span className="error-message">{errors.underlyingConditions}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="otherInfo">기타 정보</label>
            <textarea
              id="otherInfo"
              name="otherInfo"
              value={formData.otherInfo}
              onChange={handleChange}
              maxLength="1000"
              rows="4"
              placeholder="추가로 기록하고 싶은 정보를 입력해주세요"
              className={errors.otherInfo ? 'error' : ''}
            />
            <span className="char-count">{formData.otherInfo.length}/1000</span>
            {errors.otherInfo && <span className="error-message">{errors.otherInfo}</span>}
          </div>

          <div className="button-group">
            <button type="submit" className="submit-button">
              {isEditing ? '저장하기' : '등록하기'}
            </button>
            {isEditing && showEditForm && (
              <button type="button" onClick={handleCancelEdit} className="cancel-button">
                취소
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default UserProfile;
