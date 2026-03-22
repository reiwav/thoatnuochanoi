import { useState } from 'react';
import {
  Activity, LayoutDashboard, List, Settings, LogOut, AlertCircle, Sparkles
} from 'lucide-react';
import { SENSOR_TOKEN } from 'constants/auth';

import LoginPage from 'views/auth/LoginPage';
import DashboardPage from 'views/dashboard/DashboardPage';
import ModbusSettingPage from 'views/modbus/ModbusSettingPage';
import HistoryTrendPage from 'views/history/HistoryTrendPage';
import ChatAI from 'views/chat/ChatAI';

import './App.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'history', label: 'History Trend', icon: Activity },
  { key: 'chat-ai', label: 'Chat AI Support', icon: Sparkles },
  { key: 'modbussetting', label: 'Modbus Setting', icon: List },
];

const PAGE_TITLES = {
  dashboard: 'Overview Analytics',
  history: 'History Trend Analysis',
  'chat-ai': 'AI Support & Analysis',
  modbussetting: 'Modbus RTU Settings',
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem(SENSOR_TOKEN));
  const [view, setView] = useState('dashboard');
  const [alerts, setAlerts] = useState([]);

  const addAlert = (msg, type = 'error') => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 5000);
  };

  const logout = () => {
    localStorage.removeItem(SENSOR_TOKEN);
    setToken(null);
  };

  if (!token) {
    return <LoginPage onLogin={setToken} />;
  }

  const renderPage = () => {
    switch (view) {
      case 'dashboard':     return <DashboardPage addAlert={addAlert} />;
      case 'history':       return <HistoryTrendPage addAlert={addAlert} />;
      case 'chat-ai':       return <ChatAI />;
      case 'modbussetting': return <ModbusSettingPage addAlert={addAlert} />;
      default:              return null;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Floating alerts */}
      <div className="alerts-container">
        {alerts.map((alert) => (
          <div key={alert.id} className={`floating-alert pop-up ${alert.type === 'success' ? 'alert-success' : ''}`}>
            <div className="alert-icon-box"><AlertCircle size={20} /></div>
            <div className="alert-content">
              <strong>{alert.type === 'success' ? 'Success' : 'System Alert'}</strong>
              <p>{alert.msg}</p>
            </div>
            <button className="close-alert" onClick={() => setAlerts((p) => p.filter((a) => a.id !== alert.id))}>×</button>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="app-logo"><Activity color="#fff" size={24} /></div>
          <span>AI QUAN TRẮC TỰ ĐỘNG</span>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-label">Main Menu</p>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={view === key ? 'active' : ''}
              onClick={() => setView(key)}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-card">
            <div className="admin-avatar">A</div>
            <div className="admin-info">
              <span className="admin-name">Administrator</span>
              <span className="admin-role">System Root</span>
            </div>
            <button onClick={logout} className="logout-icon-btn"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="content">
        <header className="top-header">
          <div className="header-title">
            <p className="breadcrumb">System / {view === 'modbussetting' ? 'Modbus' : view.charAt(0).toUpperCase() + view.slice(1)}</p>
            <h1>{PAGE_TITLES[view]}</h1>
          </div>
          <div className="header-actions">
            <div className="status-badge online">
              <span className="pulse"></span> System Online
            </div>
            <div className="time-display">{new Date().toLocaleTimeString()}</div>
          </div>
        </header>

        {renderPage()}
      </main>
    </div>
  );
}
