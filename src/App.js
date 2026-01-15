import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './components/Auth';
import UserProfile from './components/UserProfile';
import MedicationList from './components/MedicationList';
import DailySymptomCalendar from './components/DailySymptomCalendar';
import AISummary from './components/AISummary';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('profile');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
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
      case 'ai-summary':
        return <AISummary userId={user.uid} />;
      default:
        return <UserProfile userId={user.uid} />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>항암치료 기록 서비스</h1>
        <div className="user-info">
          <span className="user-email">{user.email}</span>
          <button className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={activeMenu === 'profile' ? 'active' : ''}
          onClick={() => setActiveMenu('profile')}
        >
          사용자 정보
        </button>
        <button
          className={activeMenu === 'medication' ? 'active' : ''}
          onClick={() => setActiveMenu('medication')}
        >
          약물 관리
        </button>
        <button
          className={activeMenu === 'calendar' ? 'active' : ''}
          onClick={() => setActiveMenu('calendar')}
        >
          증상 캘린더
        </button>
        <button
          className={activeMenu === 'ai-summary' ? 'active' : ''}
          onClick={() => setActiveMenu('ai-summary')}
        >
          AI 요약
        </button>
      </nav>

      <main className="app-content">
        {renderContent()}
      </main>

      <footer className="app-footer">
        <p>항암치료 기록 서비스 &copy; 2024</p>
      </footer>
    </div>
  );
}

export default App;
