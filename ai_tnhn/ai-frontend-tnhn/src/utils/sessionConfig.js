export const SESSION_TYPES = {
    CHECKIN: 'CHECKIN',
    LUCKY_DRAW: 'LUCKY_DRAW',
    MINI_GAME: 'MINI_GAME'
};

export const SESSION_TABS_CONFIG = {
    [SESSION_TYPES.CHECKIN]: [
        { id: 'form', label: 'Thu thập thông tin' },
        { id: 'flow', label: 'Luồng xử lý (Flow)' },
        { id: 'history', label: 'Lịch sử tham gia' }
    ],
    [SESSION_TYPES.LUCKY_DRAW]: [
        { id: 'prizes', label: 'Giải thưởng' },
        { id: 'logic', label: 'Tỉ lệ & Cơ chế' },
        { id: 'winners', label: 'Danh sách trúng' }
    ],
    [SESSION_TYPES.MINI_GAME]: [
        { id: 'game_settings', label: 'Cài đặt Game' },
        { id: 'leaderboard', label: 'Bảng xếp hạng' }
    ]
};