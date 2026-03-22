import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Check, BarChart3, MessageSquare } from 'lucide-react';
import sensorApi from 'api/sensor';
import deviceApi from 'api/device';

export default function DashboardPage({ addAlert }) {
  const [monitorData, setMonitorData] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedLink, setSelectedLink] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (!selectedLink) return;
    setLoading(true); 
    fetchAll(selectedLink);
    const interval = setInterval(() => fetchAll(selectedLink), 5000);
    return () => clearInterval(interval);
  }, [selectedLink]);

  const fetchDevices = async () => {
    try {
      const resp = await deviceApi.getAll();
      const data = resp.data || [];
      setDevices(data);
      if (data.length > 0) {
        const savedId = localStorage.getItem('globalStationId');
        const initDev = data.find(d => d.id === savedId) ? data.find(d => d.id === savedId) : data[0];
        setSelectedLink(initDev.link);
      }
    } catch (err) { console.error('Devices:', err); }
  };

  const fetchAll = async (link) => {
    await Promise.all([fetchMonitor(link), fetchAlarms(link), fetchOutputs(link)]);
  };

  const fetchMonitor = async (link) => {
    try {
      const resp = await sensorApi.getMonitor({ link });
      const data = resp.data || [];
      setMonitorData(data);
      setLoading(false);
    } catch (err) { 
      console.error('Monitor:', err); 
      setLoading(true); // Keep loading on error per user request
    }
  };



  const fetchAlarms = async (link) => {
    try {
      const resp = await sensorApi.getAlarms({ link });
      setAlarms(resp.data || []);
    } catch (err) { console.error('Alarms:', err); }
  };

  const fetchOutputs = async (link) => {
    try {
      const resp = await sensorApi.getOutputs({ link });
      setOutputs(resp.data || []);
    } catch (err) { console.error('Outputs:', err); }
  };

  const toggleOutput = async (id, current) => {
    if (!selectedLink) return;
    try {
      await sensorApi.toggleOutput(id, !current, selectedLink);
      fetchOutputs(selectedLink);
    } catch (err) { console.error('Toggle:', err); }
  };

  return (
    <div className="dashboard-grid">
      {/* Top refresh button for layout consistency if needed, but let's just make it a simple row or add it to the header later. For now, we'll keep a small refresh bar */}
      {/* Station selector */}
      <div className="card glass station-selector" style={{ justifyContent: 'space-between', padding: '15px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Station:</label>
          <select 
            value={selectedLink} 
            onChange={(e) => {
              setMonitorData([]);
              setAlarms([]);
              setOutputs([]);
              const newLink = e.target.value;
              setSelectedLink(newLink);
              const dbDev = devices.find(d => d.link === newLink);
              if (dbDev) localStorage.setItem('globalStationId', dbDev.id);
            }}
            style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff',
              padding: '8px 12px', borderRadius: '10px', fontSize: '14px', outline: 'none', cursor: 'pointer'
            }}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.link}>{d.address} — {d.name}</option>
            ))}
          </select>
        </div>
        <button className="icon-btn" onClick={() => fetchAll(selectedLink)}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Monitor Cards */}
      <div className="monitor-grid" style={{ position: 'relative', minHeight: '300px' }}>
        {loading && (
          <div className="loading-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: '28px', gap: '15px', border: '1px solid var(--border-color)'
          }}>
             <RefreshCw className="spin" size={40} color="var(--accent-secondary)" />
             <div style={{ color: '#fff', fontWeight: '600', letterSpacing: '0.5px' }}>Fetching System Data...</div>
             <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Waiting for response from sensor station</div>
          </div>
        )}

        {monitorData.map((mon, idx) => {
          const val = parseFloat(mon.value) || 0;
          let isWarning = false;
          let isAlarm = false;

          const currentDevice = devices.find(d => d.link === selectedLink);
          if (currentDevice && currentDevice.config) {
            const cfg = currentDevice.config.find(c => mon.name.toLowerCase().includes(c.code.toLowerCase()));
            if (cfg) {
              const warnSet = parseFloat(cfg.warningSet) || 0;
              const highSet = parseFloat(cfg.highAlarmSet) || 0;
              if (warnSet > 0 || highSet > 0) {
                 if (highSet > 0 && val >= highSet) {
                    isAlarm = true;
                 } else if (warnSet > 0 && val >= warnSet) {
                    isWarning = true;
                 }
              }
            }
          }

          let cardClass = 'safe-border';
          let textColor = 'text-success';
          let Badge = <div className="safe-badge pop-up"><Check size={12} /> Within Range</div>;

          if (isAlarm) {
            cardClass = 'alert-border';
            textColor = 'text-error';
            Badge = <div className="limit-alert pop-up"><AlertCircle size={12} /> High Alarm</div>;
          } else if (isWarning) {
            cardClass = 'warning-border';
            textColor = 'text-warning';
            Badge = <div className="limit-alert pop-up" style={{ background: 'var(--warning)' }}><AlertCircle size={12} /> Warning</div>;
          }

          return (
            <div key={idx} className={`card glass monitor-card zoom-in ${cardClass}`}>
              <div className="monitor-label">{mon.name}</div>
              <div className="monitor-value-row">
                <span className={`monitor-main-value ${textColor}`}>{mon.value}</span>
                <span className="monitor-unit">{mon.unit}</span>
              </div>
              {Badge}
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


      <div className="bottom-row">
        {/* Output Control */}
        <div className="card glass table-card">
          <div className="card-header">
            <h3>Output Control</h3>
            <BarChart3 size={18} color="#a1a1aa" />
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Output Name</th><th>Control</th><th>Mode</th></tr></thead>
              <tbody>
                {outputs.map((out) => (
                  <tr key={out.id}>
                    <td>{out.name}</td>
                    <td>
                      <button className={`status-toggle-btn ${out.control ? 'active' : ''}`} onClick={() => toggleOutput(out.id, out.control)}>
                        {out.control ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td><span className={`badge ${out.mode === 'Man' ? 'warning' : 'info'}`}>{out.mode}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alarm History */}
        <div className="card glass table-card">
          <div className="card-header">
            <h3>Alarm History</h3>
            <MessageSquare size={18} color="#a1a1aa" />
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>ID</th><th>Date Time</th><th>Event</th></tr></thead>
              <tbody>
                {alarms.length > 0 ? alarms.map((alarm, idx) => (
                  <tr key={idx}>
                    <td>{alarm.alarmId}</td>
                    <td>
                      <div className="date-cell">{alarm.date}</div>
                      <div className="time-sub">{alarm.time}</div>
                    </td>
                    <td className="event-msg text-left">{alarm.message}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="text-center py-8 opacity-50">No recent alarms</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
