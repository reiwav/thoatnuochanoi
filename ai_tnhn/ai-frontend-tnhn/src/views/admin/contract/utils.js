export const getFileUrl = (file) => {
    if (!file) return '#';
    let link = file.link;
    if (!link) {
        if (file.id && file.id.startsWith('local:')) {
            link = '/api/storage/file/' + file.id.substring(6);
        } else {
            return `https://drive.google.com/open?id=${file.id}`;
        }
    }
    if (link.startsWith('/') || link.startsWith('local:')) {
        const relativeLink = link.startsWith('local:') ? '/api/storage/file/' + link.substring(6) : link;
        const apiBase = import.meta.env?.VITE_APP_API_URL || '';
        return `${apiBase}${relativeLink}`;
    }
    return link;
};

export const getStageStatus = (stage) => {
    if (!stage) return { label: 'Chưa thực hiện', color: 'default', bgColor: '#f1f5f9', textColor: '#64748b', border: '1px solid #cbd5e1' };
    
    // Check manual status first
    if (stage.status) {
        if (stage.status === 'Đã thanh toán') {
            return { label: 'Đã thanh toán', color: 'success', bgColor: '#f0fdf4', textColor: '#15803d', border: '1px solid #bbf7d0' };
        }
        if (stage.status === 'Đã nghiệm thu') {
            return { label: 'Đã nghiệm thu', color: 'primary', bgColor: '#eff6ff', textColor: '#1d4ed8', border: '1px solid #bfdbfe' };
        }
        if (stage.status === 'Đang thực hiện') {
            return { label: 'Đang thực hiện', color: 'warning', bgColor: '#fffbeb', textColor: '#b45309', border: '1px solid #fef08a' };
        }
        if (stage.status === 'Chưa thực hiện') {
            return { label: 'Chưa thực hiện', color: 'default', bgColor: '#f1f5f9', textColor: '#64748b', border: '1px solid #cbd5e1' };
        }
    }

    const hasAcceptance = stage.acceptance_records && stage.acceptance_records.length > 0;
    const hasPayment = stage.payment_records && stage.payment_records.length > 0;
    
    if (hasPayment) {
        return { label: 'Đã thanh toán', color: 'success', bgColor: '#f0fdf4', textColor: '#15803d', border: '1px solid #bbf7d0' };
    }
    if (hasAcceptance) {
        return { label: 'Đã nghiệm thu', color: 'primary', bgColor: '#eff6ff', textColor: '#1d4ed8', border: '1px solid #bfdbfe' };
    }
    return { label: 'Chưa thực hiện', color: 'default', bgColor: '#f1f5f9', textColor: '#64748b', border: '1px solid #cbd5e1' };
};

export const getScanFileName = (link, fallbackName) => {
    if (!link) return fallbackName;
    try {
        const url = new URL(link, window.location.origin);
        const nameParam = url.searchParams.get('name');
        if (nameParam) {
            return decodeURIComponent(nameParam);
        }
    } catch (e) {
        // ignore url parsing error and fall back to path parsing
    }

    const parts = link.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
        // Strip out the nano timestamp unique suffix if it has one: e.g. filename_1782562109.pdf
        const extIndex = lastPart.lastIndexOf('.');
        const ext = extIndex !== -1 ? lastPart.substring(extIndex) : '';
        let base = extIndex !== -1 ? lastPart.substring(0, extIndex) : lastPart;
        
        // Match timestamp suffix _\d{10,}
        const regex = /_\d{10,}$/;
        if (regex.test(base)) {
            base = base.replace(regex, '');
            return base + ext;
        }
        // Clean out any extra search params if present in plain string splitting
        const queryIndex = lastPart.indexOf('?');
        if (queryIndex !== -1) {
            return lastPart.substring(0, queryIndex);
        }
        return lastPart;
    }
    return fallbackName;
};

