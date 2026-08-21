import { createRoot } from 'react-dom/client';

// project imports
import App from 'App';
import * as serviceWorker from 'serviceWorker';
import reportWebVitals from 'reportWebVitals';

// Disable console and debugger in production
if (import.meta.env.MODE === 'production') {
  // Clear console functions
  console.log = () => { };
  console.debug = () => { };
  console.info = () => { };
  console.warn = () => { };
  console.error = () => { };

  // Debugger trap to deter inspection
  setInterval(() => {
    (function () {
      return false;
    }
    ['constructor']('debugger')
    ['call']());
  }, 1000);

  // Prevent iframe embedding (Clickjacking protection)
  if (window.self !== window.top) {
    window.top.location = window.self.location;
  }

  // Allow text selection but prevent image dragging
  document.addEventListener('dragstart', (e) => {
    if (e.target.nodeName === 'IMG') {
      e.preventDefault();
    }
  });

  // Prevent F12 and DevTools shortcuts
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I / J / C (DevTools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+S (Save as)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+P (Print)
    if (e.ctrlKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      return false;
    }
  });

  // Prevent Auto-Clickers & Scripted Clicks
  let lastClickTime = 0;
  let rapidClickCount = 0;

  document.addEventListener('click', (e) => {
    // 1. Chặn click ảo từ code Javascript (vd: document.getElementById('btn').click())
    if (!e.isTrusted) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // 2. Chặn phần mềm Auto Click (Click quá nhanh liên tục)
    const now = Date.now();
    // Nếu khoảng cách giữa 2 lần click nhỏ hơn 80ms (nhanh hơn mức con người bình thường có thể làm nhiều lần)
    if (now - lastClickTime < 80) {
      rapidClickCount++;
      if (rapidClickCount > 5) { // Nếu lặp lại liên tục quá 5 lần -> Chắc chắn là Auto Click
        e.preventDefault();
        e.stopPropagation();
        return false; // Nuốt luôn sự kiện click này, không cho truyền tới component React
      }
    } else {
      rapidClickCount = 0; // Reset nếu tốc độ click bình thường trở lại
    }
    lastClickTime = now;
  }, true); // Dùng true (capture phase) để chặn từ vòng ngoài cùng trước khi nó tới được nút bấm
}

// style + assets
import 'assets/scss/style.scss';

// google-fonts
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/700.css';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

// ==============================|| REACT DOM RENDER ||============================== //

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <App />
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
