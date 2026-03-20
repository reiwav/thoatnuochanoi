import { useState, useEffect } from 'react';
import sensorApi from 'api/sensor';
import deviceApi from 'api/device';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HC_exporting from 'highcharts/modules/exporting';
import HC_exportData from 'highcharts/modules/export-data';

// Initialize Highcharts modules safely for Vite ESM
try {
    if (typeof HC_exporting === 'function') {
        HC_exporting(Highcharts);
    } else if (HC_exporting && typeof HC_exporting.default === 'function') {
        HC_exporting.default(Highcharts);
    }

    if (typeof HC_exportData === 'function') {
        HC_exportData(Highcharts);
    } else if (HC_exportData && typeof HC_exportData.default === 'function') {
        HC_exportData.default(Highcharts);
    }
} catch (e) {
    console.error('Highcharts init error:', e);
}

const CHANNELS = [
  { id: 0, name: 'pH (-)' },
  { id: 1, name: 'Temp (oC)' },
  { id: 2, name: 'COD (mg/l)' },
  { id: 3, name: 'TSS (mg/l)' },
  { id: 4, name: 'Flow out 1 (m3/h)' },
  { id: 5, name: 'Flow in 1 (m3/h)' },
  { id: 6, name: 'NH4+ (mg/l)' },
  { id: 7, name: 'Total out (m3)' },
  { id: 8, name: 'Total in 1 (m3)' },
];

export default function HistoryTrendPage() {
  const [devices, setDevices] = useState([]);
  const [selectedLink, setSelectedLink] = useState('');
  
  // Settings Form State
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [days, setDays] = useState(1);
  const tzOffset = 7 * 60 * 60 * 1000;
  
  const todayStr = new Date(Date.now() + tzOffset).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  
  // Data State
  const [chartOptions, setChartOptions] = useState({});

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
        const initDev = data.find(d => d.id === savedId) ? data.find(d => d.id === savedId) : data[0];
        setSelectedLink(initDev.link);
      }
    } catch (err) { console.error('Devices:', err); }
  };

  useEffect(() => {
    if (selectedLink) {
        // Auto-update StartDate based on Days if days changed natively? 
        // We will just keep them independent, and Load Data uses dates.
        loadData();
    }
  }, [selectedLink]); 

  // Watch days input to adjust startDate relative to endDate
  useEffect(() => {
     if (days && days > 0) {
        const endD = new Date(endDate);
        endD.setDate(endD.getDate() - days + 1);
        setStartDate(endD.toISOString().split('T')[0]);
     }
  }, [days, endDate]);

  const loadData = async () => {
    if (!selectedLink) return;
    setLoading(true);
    try {
      const resp = await sensorApi.getHistoryTrend(selectedLink, selectedChannel, startDate, endDate);
      const rawData = resp.data || [];
      
      let chartSeriesData = [];
      let cMin = 999999;
      let cMax = -999999;
      let sum = 0;
      let minTimeStr = '';
      let maxTimeStr = '';

      if (rawData.length > 0) {
        let minEl = rawData[0];
        let maxEl = rawData[0];

        rawData.forEach(p => {
          const val = p.value;
          sum += val;
          if (val < cMin) { cMin = val; minEl = p; }
          if (val > cMax) { cMax = val; maxEl = p; }
          
          const jsTime = new Date(p.timestamp).getTime();
          chartSeriesData.push([jsTime, val]);
        });

        const fmtDate = (dString) => {
            const d = new Date(dString);
            return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
        };

        minTimeStr = fmtDate(minEl.timestamp);
        maxTimeStr = fmtDate(maxEl.timestamp);
      }

      let codeName = '';
      if (rawData.length > 0) {
        codeName = rawData[0].code || '';
      }
      const foundChan = CHANNELS.find(c => c.id === Number(selectedChannel));
      let cUnit = '';
      if (foundChan) {
          if (!codeName) codeName = foundChan.name.split(' ')[0];
          if (foundChan.name.includes('(')) {
              cUnit = foundChan.name.split('(')[1].replace(')', '');
          }
      }

      const count = rawData.length;
      const avg = count > 0 ? (sum / count).toFixed(2) : 0;
      
      let titleHtml = '';
      if (count > 0) {
          titleHtml = `<b>${codeName}</b> Min: <b>${cMin}</b> - ${minTimeStr} Max: <b>${cMax}</b> - ${maxTimeStr}<br/>Avg: <b>${avg}</b> - Entries: <b>${count}</b>`;
      } else {
          titleHtml = `<b>${codeName}</b> - No Data Available`;
      }

      // Force chart boundary from exactly 00:00 to 23:59
      const forceMinTime = new Date(`${startDate}T00:00:00`).getTime();
      const forceMaxTime = new Date(`${endDate}T23:59:59`).getTime();
      const daysSpan = (forceMaxTime - forceMinTime) / (1000 * 60 * 60 * 24);

      let dynamicTick = 24 * 3600 * 1000; // 1 day default
      if (daysSpan <= 1) {
          dynamicTick = 30 * 60 * 1000; // 30 minutes for 1 day
      } else if (daysSpan <= 3) {
          dynamicTick = 3 * 3600 * 1000; // 3 hours for 2-3 days
      }

      // If the frame has relatively few data points (around <= 60 points), it's sparse enough to show markers clearly!
      const showMarkers = chartSeriesData.length <= 60;

      // Configure Highcharts for Dark Theme
      setChartOptions({
        accessibility: { enabled: false },
        chart: {
            type: 'line',
            zoomType: 'x',
            backgroundColor: 'transparent', // Match glass UI
            borderRadius: 8,
            style: { fontFamily: 'inherit', color: '#fff' }
        },
        title: {
            text: titleHtml,
            useHTML: true,
            style: { fontSize: '14px', color: '#fff' }
        },
        xAxis: {
            type: 'datetime',
            title: { text: 'Date' },
            min: forceMinTime,
            tickPixelInterval: 120, // Forces clean dynamic spacing without overlaps
            labels: { 
                rotation: 0, // Force horizontal text always
                style: { color: '#9ca3af', fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap' },
                formatter: function() {
                   const d = new Date(this.value);
                   const ms = String(d.getMonth()+1).padStart(2,'0');
                   const ds = String(d.getDate()).padStart(2,'0');
                   
                   if (daysSpan > 3) {
                       return `${d.getFullYear()}<br/>${ms}-${ds}`;
                   } else {
                       const hs = String(d.getHours()).padStart(2,'0');
                       const mns = String(d.getMinutes()).padStart(2,'0');
                       return `${d.getFullYear()}-${ms}-${ds}<br/>${hs}:${mns}`;
                   }
                }
            },
            lineColor: '#1f2937',
            tickColor: '#1f2937'
        },
        yAxis: {
            title: { text: null },
            gridLineColor: 'rgba(255,255,255,0.1)',
            labels: { style: { color: '#9ca3af' } }
        },
        tooltip: {
            xDateFormat: '%Y-%m-%d %H:%M:%S',
            shared: true,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            style: { color: '#fff' }
        },
        legend: {
            enabled: true,
            verticalAlign: 'bottom',
            itemStyle: { color: '#e5e7eb', fontWeight: 'normal' },
            itemHoverStyle: { color: '#fff' }
        },
        exporting: {
            enabled: true,
            buttons: {
                contextButton: {
                    menuItems: ['viewFullscreen', 'printChart', 'separator', 'downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG', 'separator', 'downloadCSV', 'downloadXLS', 'viewData']
                }
            }
        },
        time: { useUTC: false }, // Render in local browser time
        series: [{
            name: codeName,
            data: chartSeriesData,
            color: '#60a5fa',
            lineWidth: 1.5,
            marker: { enabled: showMarkers, radius: 4, states: { hover: { enabled: true, radius: 5 } } }
        }],
        credits: { enabled: false }
      });

    } catch (err) {
      console.error(err);
      setChartOptions({});
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '4fr 1.3fr', gap: '20px', paddingBottom: '30px' }}>
      {/* Chart Panel */}
      <div className="card glass" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '500' }}>Chart</h3>
        </div>
        <div style={{ padding: '15px', position: 'relative', minHeight: '400px' }}>
            {loading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10, display:'flex', alignItems:'center', justifyContent:'center', color: '#fff', fontWeight: 'bold' }}>
                    Loading data...
                </div>
            )}
            {HighchartsReact && (
               (() => {
                   const RenderHC = HighchartsReact.default || HighchartsReact;
                   return <RenderHC highcharts={Highcharts} options={chartOptions} />;
               })()
            )}
        </div>
      </div>

      {/* Settings Panel */}
      <div className="card glass" style={{ padding: '0' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '500' }}>Settings</h3>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Station Select</label>
            <select 
              value={selectedLink} 
              onChange={(e) => {
                setSelectedLink(e.target.value);
                const dbDev = devices.find(d => d.link === e.target.value);
                if (dbDev) localStorage.setItem('globalStationId', dbDev.id);
              }}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', outline: 'none', color: '#fff' }}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.link}>{d.address} — {d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Sensor Select</label>
            <select 
              value={selectedChannel} 
              onChange={(e) => setSelectedChannel(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', outline: 'none', color: '#fff' }}
            >
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Days</label>
            <input 
              type="number" 
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              min="1"
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Startdate(YYYY-MM-DD)</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Enddate (YYYY-MM-DD)</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={loadData}
              disabled={loading}
              style={{ padding: '8px 16px', fontWeight: '500', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', width: '100%' }}
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>

          <div style={{ marginTop: '5px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button 
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '8px', padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/></svg>
              Print
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
