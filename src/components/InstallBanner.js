import React, { useState, useEffect } from 'react';
import '../styles/InstallBanner.css';

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 이미 설치된 앱인지 확인
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (isStandalone) {
      return; // 이미 설치된 경우 배너 표시 안함
    }

    // 배너 닫기 상태 확인 (같은 날짜 동안 숨김)
    const dismissedDate = localStorage.getItem('installBannerDismissedDate');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    if (dismissedDate === today) {
      return;
    }

    // beforeinstallprompt 이벤트 캡처
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 배너 기본 표시 (PWA 미설치 상태)
    setShowBanner(true);

    // appinstalled 이벤트 - 설치 완료 시
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Android 설치 프롬프트 표시
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // 수동 설치 안내
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);

      if (isIOS) {
        alert('Safari 하단의 공유 버튼(□↑)을 누른 후\n"홈 화면에 추가"를 선택하세요.');
      } else if (isAndroid) {
        alert('Chrome 메뉴(⋮)를 누른 후\n"홈 화면에 추가" 또는 "앱 설치"를 선택하세요.');
      } else {
        alert('브라우저 메뉴에서\n"홈 화면에 추가" 또는 "앱 설치"를 선택하세요.');
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    localStorage.setItem('installBannerDismissedDate', today);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <div className="install-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="install-banner-text">
          <strong>앱으로 설치하기</strong>
          <span>홈 화면에 추가하면 더 빠르게 사용할 수 있어요</span>
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="install-btn" onClick={handleInstallClick}>
          설치
        </button>
        <button className="dismiss-btn" onClick={handleDismiss}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default InstallBanner;
