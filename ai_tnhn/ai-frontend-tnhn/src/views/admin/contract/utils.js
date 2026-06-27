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
