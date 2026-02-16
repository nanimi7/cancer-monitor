import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import '../styles/Auth.css';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 유효성 검사
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // 로그인
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // 회원가입
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('인증 오류:', error);
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('이미 사용 중인 이메일입니다.');
          break;
        case 'auth/invalid-email':
          setError('유효하지 않은 이메일 형식입니다.');
          break;
        case 'auth/user-not-found':
          setError('등록되지 않은 이메일입니다.');
          break;
        case 'auth/wrong-password':
          setError('비밀번호가 올바르지 않습니다.');
          break;
        case 'auth/weak-password':
          setError('비밀번호는 최소 6자 이상이어야 합니다.');
          break;
        default:
          setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setResetError('이메일을 입력해주세요.');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      switch (error.code) {
        case 'auth/invalid-email':
          setResetError('유효하지 않은 이메일 형식입니다.');
          break;
        case 'auth/user-not-found':
          setResetError('등록되지 않은 이메일입니다.');
          break;
        default:
          setResetError('오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail('');
    setResetError('');
    setResetSuccess(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🏥 항암치료 추적기</h1>
          <p className="auth-subtitle">건강한 회복을 위한 기록 서비스</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => isLogin || toggleMode()}
          >
            로그인
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => !isLogin || toggleMode()}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 6자 이상"
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                disabled={loading}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-submit-button" disabled={loading}>
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>

          {isLogin && (
            <button
              type="button"
              className="forgot-password-button"
              onClick={() => setShowResetModal(true)}
            >
              비밀번호를 잊으셨나요?
            </button>
          )}
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <button className="auth-toggle-button" onClick={toggleMode}>
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="reset-modal">
            <h3>비밀번호 찾기</h3>
            {resetSuccess ? (
              <>
                <div className="reset-success">
                  <p>비밀번호 재설정 링크가 이메일로 전송되었습니다.</p>
                  <p>이메일을 확인해주세요.</p>
                </div>
                <button onClick={closeResetModal} className="reset-confirm-button">
                  확인
                </button>
              </>
            ) : (
              <>
                <p className="reset-description">
                  가입한 이메일 주소를 입력하시면<br />
                  비밀번호 재설정 링크를 보내드립니다.
                </p>
                <div className="form-group">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="이메일 주소"
                    disabled={resetLoading}
                  />
                  {resetError && <span className="error-message">{resetError}</span>}
                </div>
                <div className="modal-buttons">
                  <button
                    onClick={closeResetModal}
                    className="reset-cancel-button"
                    disabled={resetLoading}
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePasswordReset}
                    className="reset-submit-button"
                    disabled={resetLoading}
                  >
                    {resetLoading ? '전송 중...' : '전송'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Auth;
