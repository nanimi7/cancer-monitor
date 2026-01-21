import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import MedicationList from './components/MedicationList';
import DailySymptomCalendar from './components/DailySymptomCalendar';
import AISummary from './components/AISummary';
import WeightManagement from './components/WeightManagement';
import PushNotification from './components/PushNotification';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('calendar');
  const pushNotification = PushNotification();

   useEffect(() => {
     // Service Worker 완전 제거
     if ('serviceWorker' in navigator) {
       navigator.serviceWorker.getRegistrations().then(registrations => {
         registrations.forEach(registration => {
           registration.unregister();
         });
       });
       
       caches.keys().then(keys => {
         keys.forEach(key => caches.delete(key));
       });
     }
   }, []);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // 로그인 시 푸시 알림 권한 요청
      if (currentUser && Notification.permission === 'default') {
        setTimeout(() => {
          if (window.confirm('알림을 받으시겠습니까? 약 복용 시간이나 중요한 기록 알림을 받을 수 있습니다.')) {
            pushNotification.requestPermission();
          }
        }, 2000);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveMenu('profile');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'profile':
        return <UserProfile userId={user.uid} />;
      case 'medication':
        return <MedicationList userId={user.uid} />;
      case 'calendar':
        return <DailySymptomCalendar userId={user.uid} />;
      case 'weight-management':
        return <WeightManagement userId={user.uid} />;
      case 'ai-summary':
        return <AISummary userId={user.uid} />;
      default:
        return <UserProfile userId={user.uid} />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-header-content">
          <h1>항암기록관리</h1>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button className="logout-button" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="app-content">
        {renderContent()}
      </main>

      <nav className="app-bottom-nav">
        <button
          className={`bottom-nav-item ${activeMenu === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveMenu('profile')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="nav-label">사용자</span>
        </button>
        <button
          className={`bottom-nav-item ${activeMenu === 'medication' ? 'active' : ''}`}
          onClick={() => setActiveMenu('medication')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <span className="nav-label">약물</span>
        </button>
        <button
          className={`bottom-nav-item ${activeMenu === 'weight-management' ? 'active' : ''}`}
          onClick={() => setActiveMenu('weight-management')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          <span className="nav-label">체중</span>
        </button>
        <button
          className={`bottom-nav-item ${activeMenu === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveMenu('calendar')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="nav-label">증상</span>
        </button>
        <button
          className={`bottom-nav-item ${activeMenu === 'ai-summary' ? 'active' : ''}`}
          onClick={() => setActiveMenu('ai-summary')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="nav-label">AI분석</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
