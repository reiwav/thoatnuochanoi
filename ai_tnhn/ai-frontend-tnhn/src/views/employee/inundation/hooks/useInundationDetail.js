import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';

const useInundationDetail = ({ selectedReport }) => {
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [reviewDialog, setReviewDialog] = useState({ open: false, itemId: null, type: null, comment: '' });
    const [editMode, setEditMode] = useState({ open: false, item: null });

    const { role: userRole, hasPermission, isEmployee, isCompany, user } = useAuthStore();

    const canReview = useMemo(() => {
        if (isEmployee) return false;
        if (!hasPermission('inundation:review')) return false;
        if (isCompany || userRole === 'super_admin') return true;
        if (!selectedReport) return false;
        return selectedReport.org_id === user?.org_id;
    }, [user, isCompany, isEmployee, selectedReport, hasPermission, userRole]);

    const handleOpenViewer = (imgs, idx = 0) => setViewer({ open: true, images: imgs, index: idx });

    const timelineData = useMemo(() => {
        if (!selectedReport) return [];
        const updates = selectedReport.updates || [];

        if (updates.length === 0) {
            return [{
                ...selectedReport,
                id: selectedReport.id,
                type: 'start', title: 'Bắt đầu đợt ngập', ts: selectedReport.created_at || selectedReport.start_time,
                images: selectedReport.images || []
            }];
        }

        return updates.map((u, i) => ({
            ...u,
            id: u.id,
            type: (u.note || u.description) === 'Bắt đầu đợt ngập' ? 'start' : 'update',
            title: (u.status === 'resolved') ? 'Kết thúc đợt ngập' : (u.note || u.description || `Cập nhật #${i + 1}`),
            ts: u.created_at || u.timestamp,
            images: u.images || []
        })).reverse();
    }, [selectedReport]);

    useEffect(() => {
        if (!selectedReport) return;
        const searchParams = new URLSearchParams(window.location.search);
        const editId = searchParams.get('edit_update_id');
        if (editId && timelineData.length > 0 && !editMode.open) {
            const updToEdit = timelineData.find((t) => t.id === editId);
            if (updToEdit) {
                setEditMode({ open: true, item: updToEdit });
                searchParams.delete('edit_update_id');
                const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [selectedReport, timelineData]);

    const handleReviewSubmit = async () => {
        if (!reviewDialog.comment.trim()) return;
        try {
            if (reviewDialog.type === 'start') {
                await inundationApi.reviewReport(reviewDialog.itemId, reviewDialog.comment);
            } else {
                await inundationApi.reviewUpdate(reviewDialog.itemId, reviewDialog.comment);
            }
            toast.success('Đã gửi phản hồi');
            setReviewDialog({ open: false, itemId: null, type: null, comment: '' });
        } catch (err) {
            toast.error('Lỗi khi gửi phản hồi');
        }
    };

    return {
        // Viewer
        viewer,
        setViewer,
        handleOpenViewer,
        // Review
        reviewDialog,
        setReviewDialog,
        handleReviewSubmit,
        canReview,
        // Edit
        editMode,
        setEditMode,
        // Data
        timelineData,
        // Auth
        isEmployee,
        hasPermission
    };
};

export default useInundationDetail;
