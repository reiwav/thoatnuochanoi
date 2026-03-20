import { useState, useEffect, useCallback } from 'react';
import { Save } from 'lucide-react';
import deviceApi from 'api/device';

export default function ModbusSettingPage({ addAlert }) {
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  // localConfig is a deep copy so edits don't affect the original state immediately
  const [localConfig, setLocalConfig] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const resp = await deviceApi.getAll();
      const data = resp.data || [];
      setDevices(data);
      if (data.length > 0) {
        const savedId = localStorage.getItem('globalStationId');
        const initId = data.find(d => d.id === savedId) ? savedId : data[0].id;
        setSelectedId(initId);
        setLocalConfig(JSON.parse(JSON.stringify(data.find(d => d.id === initId)?.config || [])));
      }
    } catch (err) { console.error('Devices:', err); }
  };

  const handleSelectDevice = (id) => {
    const dev = devices.find((d) => d.id === id);
    setSelectedId(id);
    localStorage.setItem('globalStationId', id);
    setLocalConfig(JSON.parse(JSON.stringify(dev?.config || [])));
  };

  const handleChange = (idx, field, value) => {
    setLocalConfig((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await deviceApi.updateConfig(selectedId, localConfig);
      // refresh devices list so cache reflects new values
      const resp = await deviceApi.getAll();
      setDevices(resp.data || []);
      addAlert && addAlert('Settings saved successfully!', 'success');
    } catch (err) {
      console.error('Save error:', err);
      addAlert && addAlert('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentDevice = devices.find((d) => d.id === selectedId);

  return (
    <div className="modbus-container">
      {/* Station selector */}
      <div className="card glass station-selector">
        <label>Station:</label>
        <select value={selectedId} onChange={(e) => handleSelectDevice(e.target.value)}>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.address} — {d.name}</option>
          ))}
        </select>
        {currentDevice && (
          <span className="device-meta">IP: {currentDevice.ip}</span>
        )}
      </div>

      {/* Table */}
      <div className="card glass table-card full-width zoom-in">
        <div className="card-header">
          <h3>Modbus RTU Registers — {currentDevice?.address}</h3>
          <button className="primary-btn-sm save-btn" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="table-wrapper">
          <table className="premium-table modbus-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th>Name</th>
                <th style={{ width: '160px' }}>Warning Set</th>
                <th style={{ width: '160px' }}>High Alarm Set</th>
                <th style={{ width: '70px' }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              {localConfig.map((item, idx) => (
                <tr key={idx}>
                  <td className="text-center mono">
                    {String(item.id).padStart(2, '0')}
                  </td>
                  <td>
                    <div className="config-name">{item.code}</div>
                    <div className="config-desc">{item.name}</div>
                  </td>
                  <td>
                    <input
                      className="table-input warning-input"
                      type="number"
                      step="any"
                      value={item.warningSet}
                      onChange={(e) => handleChange(idx, 'warningSet', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input alert-input"
                      type="number"
                      step="any"
                      value={item.highAlarmSet}
                      onChange={(e) => handleChange(idx, 'highAlarmSet', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <span className="unit-badge">{item.unit}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
