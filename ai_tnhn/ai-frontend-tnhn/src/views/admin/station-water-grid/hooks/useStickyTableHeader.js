import { useRef, useEffect } from 'react';

/**
 * Hook tạo floating header cho bảng khi cuộn trang Chrome qua phần thead.
 * - Bảng vẫn hiển thị đầy đủ chiều cao (không giới hạn maxHeight)
 * - Bảng vẫn có scroll ngang (overflow-x: auto)
 * - Khi cuộn dọc bằng Chrome, header tự động dính lên trên màn hình
 * 
 * Trả về: { containerRef, theadRef, floatingRef }
 * - containerRef: gắn vào TableContainer
 * - theadRef: gắn vào TableHead (thead)
 * - floatingRef: gắn vào một <div> trống đặt trước TableContainer
 */
const useStickyTableHeader = () => {
    const containerRef = useRef(null);
    const theadRef = useRef(null);
    const floatingRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let raf = null;
        let cloneBuilt = false;

        const buildClone = () => {
            const thead = theadRef.current;
            const floating = floatingRef.current;
            if (!thead || !floating) return;

            const realTable = thead.closest('table');
            if (!realTable) return;

            // Tạo bảng clone chỉ chứa thead
            const tableEl = document.createElement('table');
            tableEl.style.borderCollapse = 'separate';
            tableEl.style.borderSpacing = '0';
            tableEl.style.tableLayout = 'fixed';
            tableEl.style.width = realTable.offsetWidth + 'px';
            tableEl.style.margin = '0';

            const theadClone = thead.cloneNode(true);
            theadClone.style.position = 'static';
            tableEl.appendChild(theadClone);

            // Copy chính xác width từng cell
            for (let r = 0; r < thead.rows.length && r < theadClone.rows.length; r++) {
                for (let c = 0; c < thead.rows[r].cells.length && c < theadClone.rows[r].cells.length; c++) {
                    const w = thead.rows[r].cells[c].getBoundingClientRect().width;
                    theadClone.rows[r].cells[c].style.width = w + 'px';
                    theadClone.rows[r].cells[c].style.minWidth = w + 'px';
                    theadClone.rows[r].cells[c].style.maxWidth = w + 'px';
                    theadClone.rows[r].cells[c].style.boxSizing = 'border-box';
                }
            }

            floating.innerHTML = '';
            floating.appendChild(tableEl);
            cloneBuilt = true;
        };

        const destroyClone = () => {
            const floating = floatingRef.current;
            if (floating) floating.innerHTML = '';
            cloneBuilt = false;
        };

        const update = () => {
            const thead = theadRef.current;
            const floating = floatingRef.current;
            if (!thead || !floating) return;

            const theadRect = thead.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Hiển thị floating header khi thead đã cuộn lên trên viewport
            // VÀ phần body bảng vẫn còn nhìn thấy trên màn hình
            const shouldStick = theadRect.top < 0 && containerRect.bottom > theadRect.height + 20;

            if (!shouldStick) {
                floating.style.display = 'none';
                if (cloneBuilt) destroyClone();
                return;
            }

            if (!cloneBuilt) buildClone();

            floating.style.display = 'block';
            floating.style.position = 'fixed';
            floating.style.top = '0px';
            floating.style.left = containerRect.left + 'px';
            floating.style.width = container.clientWidth + 'px';
            floating.style.overflowX = 'hidden';
            floating.style.overflowY = 'hidden';
            floating.style.zIndex = '1100';
            floating.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
            floating.style.backgroundColor = '#fff';
            floating.scrollLeft = container.scrollLeft;
        };

        const onTick = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(update);
        };

        const onResize = () => {
            destroyClone();
            onTick();
        };

        window.addEventListener('scroll', onTick, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        container.addEventListener('scroll', onTick, { passive: true });

        return () => {
            window.removeEventListener('scroll', onTick);
            window.removeEventListener('resize', onResize);
            container.removeEventListener('scroll', onTick);
            if (raf) cancelAnimationFrame(raf);
            destroyClone();
        };
    }, []);

    return { containerRef, theadRef, floatingRef };
};

export default useStickyTableHeader;
