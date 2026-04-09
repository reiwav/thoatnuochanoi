import { useState, useEffect } from 'react';

const useDevToolsDetector = () => {
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

    useEffect(() => {
        // Allow debugging in non-production environments or when status is 'dev'
        if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_APP_STATUS === 'dev') return;

        // Disable detection on mobile devices (they don't have DevTools anyway)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // On mobile, only detect based on explicit keyboard shortcuts (which won't work anyway)
            return;
        }

        const threshold = 160;

        const check = () => {
            // 1. Check window size difference (most common for docked devtools)
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;

            // 2. Check for debugger statement performance (crude but effective)
            const start = performance.now();
            // eslint-disable-next-line no-debugger
            debugger;
            const end = performance.now();
            const debuggerDiff = end - start > 100;

            if (widthDiff || heightDiff || debuggerDiff) {
                if (!isDevToolsOpen) setIsDevToolsOpen(true);
            } else {
                if (isDevToolsOpen) setIsDevToolsOpen(false);
            }
        };

        const interval = setInterval(check, 1000);
        window.addEventListener('resize', check);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', check);
        };
    }, [isDevToolsOpen]);

    useEffect(() => {
        // Allow debugging in non-production environments or when status is 'dev'
        if (import.meta.env.MODE !== 'production' || import.meta.env.VITE_APP_STATUS === 'dev') return;

        // Prevent right click
        const handleContextMenu = (e) => e.preventDefault();

        // Prevent common shortcuts
        const handleKeyDown = (e) => {
            if (
                e.keyCode === 123 || // F12
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
                (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
                (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74)) // Cmd+Opt+I/J
            ) {
                e.preventDefault();
                setIsDevToolsOpen(true);
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return isDevToolsOpen;
};

export default useDevToolsDetector;
