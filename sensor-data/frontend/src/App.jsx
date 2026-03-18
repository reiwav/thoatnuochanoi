import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LogIn, User, Lock, AlertCircle, LayoutDashboard, 
  Settings, Activity, MessageSquare, LogOut, 
  Check, X, Power, RefreshCw, BarChart3, List
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './App.css';

const API_BASE = 'http://localhost:8080/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // dashboard, calibration

  // Data states
  const [monitorData, setMonitorData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Thresholds from Calibration (assuming real-world logic)
  const [thresholds, setThresholds] = useState({
    'pH (-)': { min: 6.5, max: 8.5 },
    'COD (mg/l)': { max: 80 },
    'NH4+ (mg/l)': { max: 5 },
    'TSS (mg/l)': { max: 50 },
  });
  const [activeAlerts, setActiveAlerts] = useState([]);

  const addAlert = (msg) => {
    const id = Date.now();
    setActiveAlerts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setActiveAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchData = async () => {
    // Monitor
    try {
      const resp = await axios.get(`${API_BASE}/data/monitor`);
      const newData = resp.data || [];
      setMonitorData(newData);
      
      // Check for violations to trigger popups
      newData.forEach(mon => {
        const limit = thresholds[mon.name];
        if (limit) {
          const val = parseFloat(mon.value);
          if (val > limit.max || (limit.min && val < limit.min)) {
            addAlert(`${mon.name} is OUT OF RANGE: ${mon.value} ${mon.unit}`);
          }
        }
      });
    } catch (err) { console.error("Monitor fetch error:", err); }

    // History with Filter
    try {
      let url = `${API_BASE}/data/history`;
      if (startTime || endTime) {
        const params = new URLSearchParams();
        if (startTime) params.append('startTime', new Date(startTime).toISOString());
        if (endTime) params.append('endTime', new Date(endTime).toISOString());
        url += `?${params.toString()}`;
      }
      const resp = await axios.get(url);
      if (resp.data && Array.isArray(resp.data)) {
        const formattedHistory = resp.data.map(p => ({
          time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...p.data
        })).reverse();
        setHistoryData(formattedHistory);
      }
    } catch (err) { console.error("History fetch error:", err); }

    // Alarms
    try {
      const resp = await axios.get(`${API_BASE}/data/alarms`);
      setAlarms(resp.data || []);
    } catch (err) { console.error("Alarms fetch error:", err); }

    // Calibration
    try {
      const resp = await axios.get(`${API_BASE}/data/calibration`);
      console.log("Calibration data received:", resp.data); // Debug
      setCalibrations(resp.data || []);
    } catch (err) { console.error("Calibration fetch error:", err); }

    // Outputs
    try {
      const resp = await axios.get(`${API_BASE}/data/outputs`);
      setOutputs(resp.data || []);
    } catch (err) { console.error("Outputs fetch error:", err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await axios.post(`${API_BASE}/auth/login`, { username, password });
      localStorage.setItem('token', resp.data.token);
      setToken(resp.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const toggleOutput = async (id, currentStatus) => {
    try {
      await axios.patch(`${API_BASE}/data/outputs/${id}`, { control: !currentStatus });
      fetchData(); // Refresh data
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>

        <div className="glass-card zoom-in">
          <div className="login-header">
            <div className="logo-box">
               <LogIn color="#8833ff" size={32} />
            </div>
            <h2>Sensor Dashboard</h2>
            <p>Please login to continue</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <User className="input-icon" size={20} />
              <input 
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="error-msg pop-up">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="spinner"></span> : "Sign In"}
            </button>
          </form>
          <div className="login-footer">
            <p>Admin Account: admin / 123456</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch(view) {
      case 'dashboard':
        return (
          <div className="dashboard-grid">
            {/* Filter Bar */}
            <div className="card glass filter-bar">
              <div className="filter-group">
                <label>From</label>
                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>To</label>
                <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <button className="primary-btn-sm" onClick={fetchData}>Apply Filter</button>
              <button className="icon-btn" onClick={() => { setStartTime(''); setEndTime(''); fetchData(); }}><RefreshCw size={14} /></button>
            </div>

            {/* Real-time Cards (UpdateMonitor1) */}
            <div className="monitor-grid">
              {monitorData.map((mon, idx) => {
                const limit = thresholds[mon.name];
                const val = parseFloat(mon.value);
                const isOver = limit && (val > limit.max || (limit.min && val < limit.min));
                return (
                  <div key={idx} className={`card glass monitor-card zoom-in ${isOver ? 'alert-border' : 'safe-border'}`}>
                    <div className="monitor-label">{mon.name}</div>
                    <div className="monitor-value-row">
                      <span className={`monitor-main-value ${isOver ? 'text-error' : 'text-success'}`}>{mon.value}</span>
                      <span className="monitor-unit">{mon.unit}</span>
                    </div>
                    {isOver ? (
                      <div className="limit-alert pop-up"><AlertCircle size={12}/> Out of Range</div>
                    ) : (
                      <div className="safe-badge pop-up"><Check size={12}/> Within Range</div>
                    )}
                    <div className="monitor-stats">
                      <div className="stat">Max: <span>{mon.max}</span></div>
                      <div className="stat">Min: <span>{mon.min}</span></div>
                      <div className="stat">Avg: <span>{mon.avg}</span></div>
                    </div>
                    <div className={`status-dot ${mon.status === '1' ? 'ok' : 'err'}`}></div>
                  </div>
                );
              })}
            </div>

            <div className="card glass chart-card">
              <div className="card-header">
                <h3>System Trends (History Trend)</h3>
                <div className="threshold-legend">
                   <span className="dot threshold"></span> Threshold Limit
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
                    <XAxis dataKey="time" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="pH (-)" stroke="#60a5fa" dot={false} strokeWidth={2} name="pH (-)" />
                    <Line type="monotone" dataKey="COD (mg/l)" stroke="#374151" dot={false} strokeWidth={2} name="COD (mg/l)" />
                    <Line type="monotone" dataKey="TSS (mg/l)" stroke="#4ade80" dot={false} strokeWidth={2} name="TSS (mg/l)" />
                    <Line type="monotone" dataKey="Temp (oC)" stroke="#fb923c" dot={false} strokeWidth={2} name="Temp (oC)" />
                    <Line type="monotone" dataKey="Flow out 1 (m3/h)" stroke="#6366f1" dot={false} strokeWidth={2} name="Flow out (m3/h)" />
                    <Line type="monotone" dataKey="Flow in 1  (m3/h)" stroke="#f43f5e" dot={false} strokeWidth={2} name="Flow in (m3/h)" />
                    <Line type="monotone" dataKey="NH4+ (mg/l)" stroke="#eab308" dot={false} strokeWidth={2} name="NH4+ (mg/l)" />
                    <Line type="monotone" dataKey="Total out 1  (m3)" stroke="#0d9488" dot={false} strokeWidth={2} name="Total out (m3)" />
                    <Line type="monotone" dataKey="Total in 1 (m3)" stroke="#ef4444" dot={false} strokeWidth={2} name="Total in (m3)" />
                    {/* Visual Threshold Line for COD example */}
                    <Line type="monotone" dataKey={() => thresholds['COD (mg/l)'].max} stroke="#ef4444" strokeDasharray="5 5" dot={false} name="COD Limit (80)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bottom-row">
              <div className="card glass table-card">
                <div className="card-header">
                  <h3>Output Control (Hardware Status)</h3>
                  <BarChart3 size={18} color="#a1a1aa" />
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Output Name</th>
                        <th>Control</th>
                        <th>Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputs.map((out) => (
                        <tr key={out.id}>
                          <td>{out.name}</td>
                          <td>
                            <button 
                              className={`status-toggle-btn ${out.control ? 'active' : ''}`}
                              onClick={() => toggleOutput(out.id, out.control)}
                            >
                               {out.control ? 'ON' : 'OFF'}
                            </button>
                          </td>
                          <td>
                            <span className={`badge ${out.mode === 'Man' ? 'warning' : 'info'}`}>
                              {out.mode}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card glass table-card">
                <div className="card-header">
                  <h3>Alarm History (System Logs)</h3>
                  <MessageSquare size={18} color="#a1a1aa" />
                </div>
                <div className="table-wrapper max-height-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date Time</th>
                        <th>Event Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alarms.length > 0 ? (
                        alarms.map((alarm, idx) => (
                          <tr key={idx}>
                            <td>{alarm.alarmId}</td>
                            <td>
                              <div className="date-cell">{alarm.date}</div>
                              <div className="time-sub">{alarm.time}</div>
                            </td>
                            <td className="event-msg text-left">{alarm.message}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center py-8 opacity-50">No recent alarms found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      case 'calibration':
        return (
          <div className="card glass table-card full-width zoom-in">
            <div className="card-header">
              <h3>Calibration Settings (Sensor Parameters)</h3>
              <button className="primary-btn-sm" onClick={fetchData}>Sync Now</button>
            </div>
            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Raw Value</th>
                    <th>Gain</th>
                    <th>Offset</th>
                    <th>Real Value</th>
                    <th>Unit</th>
                    <th>FTP Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrations.length > 0 ? (
                    calibrations.map((cal, idx) => (
                      <tr key={idx}>
                        <td className="font-bold">{cal.channel}</td>
                        <td className="mono">{cal.value}</td>
                        <td className="input-cell"><input defaultValue={cal.gain} /></td>
                        <td className="input-cell"><input defaultValue={cal.offset} /></td>
                        <td className="mono highlight">{cal.real}</td>
                        <td><span className="unit-badge">{cal.unit}</span></td>
                        <td>
                          <div className={`checkbox-box ${cal.status === '1' ? 'checked' : ''}`}>
                            {cal.status === '1' ? <Check size={14}/> : <X size={14}/>}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-8 opacity-50">
                         No sensor data found or system still syncing...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Floating Alert Popups */}
      <div className="alerts-container">
        {activeAlerts.map(alert => (
          <div key={alert.id} className="floating-alert pop-up">
            <div className="alert-icon-box"><AlertCircle size={20} /></div>
            <div className="alert-content">
              <strong>Threshold Warning!</strong>
              <p>{alert.msg}</p>
            </div>
            <button className="close-alert" onClick={() => setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))}>×</button>
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="app-logo">
            <Activity color="#fff" size={24} />
          </div>
          <span>ECAPRO V2.5</span>
        </div>
        
        <nav className="sidebar-nav">
          <p className="nav-label">Main Menu</p>
          <button 
            className={view === 'dashboard' ? 'active' : ''} 
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            className={view === 'calibration' ? 'active' : ''} 
            onClick={() => setView('calibration')}
          >
            <Settings size={18} /> Calibration
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-card">
             <div className="admin-avatar">A</div>
             <div className="admin-info">
                <span className="admin-name">Administrator</span>
                <span className="admin-role">System Root</span>
             </div>
             <button onClick={logout} className="logout-icon-btn">
                <LogOut size={16} />
             </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="top-header">
          <div className="header-title">
            <p className="breadcrumb">System / {view.charAt(0).toUpperCase() + view.slice(1)}</p>
            <h1>{view === 'dashboard' ? 'Overview Analytics' : 'System Configuration'}</h1>
          </div>
          <div className="header-actions">
            <div className="status-badge online">
               <span className="pulse"></span> System Online
            </div>
            <div className="time-display">
               {new Date().toLocaleTimeString()}
            </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}

export default App;
