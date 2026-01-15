import React, { useState } from 'react';
import UserProfile from './components/UserProfile';
import MedicationList from './components/MedicationList';
import DailySymptomCalendar from './components/DailySymptomCalendar';
import AISummary from './components/AISummary';
import './App.css';

function App() {
  const [activeMenu, setActiveMenu] = useState('profile');

  const renderContent = () => {
    switch (activeMenu) {
      case 'profile':
        return <UserProfile />;
      case 'medication':
        return <MedicationList />;
      case 'calendar':
        return <DailySymptomCalendar />;
      case 'ai-summary':
        return <AISummary />;
      default:
        return <UserProfile />;
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>항암치료 기록 서비스</h1>
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
