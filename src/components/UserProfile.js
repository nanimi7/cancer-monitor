import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import '../styles/UserProfile.css';

function UserProfile({ userId }) {
  const [formData, setFormData] = useState({
    nickname: '',
    birthdate: '',
    gender: '',
    disease: '',
    diagnosisDate: '',
    underlyingConditions: '',
    otherInfo: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [profileDocId, setProfileDocId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/profile`));
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setProfileDocId(querySnapshot.docs[0].id);
        // 기존 데이터에 otherInfo가 없을 수 있으므로 기본값 설정
        setFormData({
          nickname: userData.nickname || '',
          birthdate: userData.birthdate || '',
          gender: userData.gender || '',
          disease: userData.disease || '',
          diagnosisDate: userData.diagnosisDate || '',
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
      if (isEditing && profileDocId) {
        await updateDoc(doc(db, userProfilePath, profileDocId), formData);
        alert('사용자 정보가 수정되었습니다.');
        setShowEditForm(false);
        await loadUserData(); // 변경사항 즉시 반영
      } else {
        const docRef = await addDoc(collection(db, userProfilePath), formData);
        setProfileDocId(docRef.id);
        setIsEditing(true);
        alert('사용자 정보가 등록되었습니다.');
        await loadUserData(); // 변경사항 즉시 반영
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

  // 회원탈퇴 처리
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const user = auth.currentUser;

      // 재인증 (보안을 위해 필요)
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);

      // Firestore 데이터 삭제
      // 1. profile 삭제
      const profileSnapshot = await getDocs(collection(db, `users/${userId}/profile`));
      for (const docSnap of profileSnapshot.docs) {
        await deleteDoc(doc(db, `users/${userId}/profile`, docSnap.id));
      }

      // 2. medications 삭제
      const medicationsSnapshot = await getDocs(collection(db, `users/${userId}/medications`));
      for (const docSnap of medicationsSnapshot.docs) {
        await deleteDoc(doc(db, `users/${userId}/medications`, docSnap.id));
      }

      // 3. symptoms 삭제
      const symptomsSnapshot = await getDocs(collection(db, `users/${userId}/symptoms`));
      for (const docSnap of symptomsSnapshot.docs) {
        await deleteDoc(doc(db, `users/${userId}/symptoms`, docSnap.id));
      }

      // 4. weights 삭제
      const weightsSnapshot = await getDocs(collection(db, `users/${userId}/weights`));
      for (const docSnap of weightsSnapshot.docs) {
        await deleteDoc(doc(db, `users/${userId}/weights`, docSnap.id));
      }

      // Firebase Auth 사용자 삭제
      await deleteUser(user);

      alert('회원탈퇴가 완료되었습니다.');
    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      if (error.code === 'auth/wrong-password') {
        setDeleteError('비밀번호가 올바르지 않습니다.');
      } else if (error.code === 'auth/too-many-requests') {
        setDeleteError('너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        setDeleteError('회원탈퇴 중 오류가 발생했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
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
                생년월일: {formData.birthdate} | {formData.gender}
              </p>
              <p className="profile-details">
                병명: {formData.disease}
                {formData.diagnosisDate && ` | 진단일: ${formData.diagnosisDate}`}
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
            <label htmlFor="diagnosisDate">최초 진단일</label>
            <input
              type="date"
              id="diagnosisDate"
              name="diagnosisDate"
              value={formData.diagnosisDate}
              onChange={handleChange}
              className={errors.diagnosisDate ? 'error' : ''}
            />
            {errors.diagnosisDate && <span className="error-message">{errors.diagnosisDate}</span>}
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

      {/* 회원탈퇴 버튼 - 카드 아래에 표시 */}
      <div className="danger-zone">
        <button onClick={() => setShowDeleteModal(true)} className="delete-account-button">
          회원탈퇴
        </button>
      </div>

      {/* 회원탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>회원탈퇴</h3>
            <p className="delete-warning">
              탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
            </p>
            <div className="form-group">
              <label>비밀번호 확인</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
              {deleteError && <span className="error-message">{deleteError}</span>}
            </div>
            <div className="modal-buttons">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="cancel-button"
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                className="confirm-delete-button"
                disabled={isDeleting}
              >
                {isDeleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
