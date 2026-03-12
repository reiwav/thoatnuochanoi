export const getTrafficStatusColor = (status) => {
    switch (status) {
        case 'Đi lại bình thường':
            return 'success';
        case 'Đi lại khó khăn':
            return 'warning';
        case 'Không đi lại được':
        case 'Không đi được':
            return 'error';
        default:
            return 'warning';
    }
};

export const getTrafficStatusLabel = (status) => {
    if (status === 'Không đi được') return 'Không đi lại được';
    return status;
};
