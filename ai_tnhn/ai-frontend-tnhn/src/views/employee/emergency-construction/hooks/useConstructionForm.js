import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

import emergencyConstructionApi from 'api/emergencyConstruction';
import useAuthStore from 'store/useAuthStore';
import { processAndWatermark } from 'utils/imageProcessor';

const useConstructionForm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const constructionId = searchParams.get('id');
    const constructionName = searchParams.get('name') || 'Chi tiết công trình';
    const initialTab = parseInt(searchParams.get('tab') || '0');
    const editReportId = searchParams.get('edit_id');

    const [tabValue, setTabValue] = useState(initialTab);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [history, setHistory] = useState([]);
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
    const [constructions, setConstructions] = useState([]);
    const [selectedConstructionId, setSelectedConstructionId] = useState(constructionId || '');

    // Form states
    const [workDone, setWorkDone] = useState('');
    const [issues, setIssues] = useState('');
    const [order, setOrder] = useState('');
    const [location, setLocation] = useState('');
    const [conclusion, setConclusion] = useState('');
    const [influence, setInfluence] = useState('');
    const [proposal, setProposal] = useState('');
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    const { isEmployee, role: userRole, hasPermission } = useAuthStore();
    const basePath = isEmployee ? '/company' : '/admin';

    useEffect(() => {
        if (!selectedConstructionId && isEmployee) {
            fetchConstructions();
        }
    }, [selectedConstructionId]);

    const fetchConstructions = async () => {
        try {
            const res = await emergencyConstructionApi.getAll({ per_page: 1000 });
            // Interceptor đã bóc tách, res là payload { data: [], total: 0 } hoặc mảng trực tiếp
            const dataArray = res?.data || (Array.isArray(res) ? res : []);
            setConstructions(dataArray);
        } catch (err) {
            console.error('Lỗi tải danh sách công trình:', err);
        }
    };

    useEffect(() => {
        if (!selectedConstructionId && !isEmployee) {
            navigate(`${basePath}/emergency-construction/dashboard`);
            return;
        }
        if (editReportId) {
            if (isEmployee) {
                toast.error('Bạn không có quyền chỉnh sửa Cập nhật tiến độ');
                navigate(`${basePath}/emergency-construction/dashboard`);
                return;
            }
            loadReportDetails();
        }
        if (tabValue === 0 && selectedConstructionId) {
            loadHistory();
        }
    }, [selectedConstructionId, tabValue, editReportId]);

    const loadReportDetails = async () => {
        setFetching(true);
        try {
            const data = await emergencyConstructionApi.getProgressById(editReportId);
            // Interceptor đã trả về data (payload) trực tiếp
            if (data) {
                setWorkDone(data.work_done || '');
                setIssues(data.issues || '');
                setOrder(data.order || '');
                setLocation(data.location || '');
                setConclusion(data.conclusion || '');
                setInfluence(data.influence || '');
                setProposal(data.proposal || '');
                setExistingImages(data.images || []);
            }
        } catch (err) {
            toast.error('Lỗi tải thông tin Cập nhật tiến độ');
        } finally {
            setFetching(false);
        }
    };

    const loadHistory = async () => {
        if (!selectedConstructionId) return;
        setLoading(true);
        try {
            const data = await emergencyConstructionApi.getProgressHistory(selectedConstructionId);
            // Interceptor đã trả về data (mảng payload)
            if (Array.isArray(data)) {
                const sortedData = [...data].sort((a, b) => b.report_date - a.report_date);
                setHistory(sortedData);
            }
        } catch (err) {
            toast.error('Lỗi tải Theo dõi tiến độ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenViewer = (imgs, idx = 0) => {
        if (!imgs || imgs.length === 0) return;
        setViewer({ open: true, images: imgs, index: idx });
    };
    const handleCloseViewer = () => setViewer({ ...viewer, open: false });
    const handlePrev = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }));
    };
    const handleNext = (e) => {
        e?.stopPropagation();
        setViewer((v) => ({ ...v, index: (v.index + 1) % v.images.length }));
    };

    const handleOpenLocalViewer = (idx) => {
        setViewer({ open: true, images: imagePreviews, index: idx, isLocal: true });
    };

    const handleExportExcel = () => {
        if (!history || history.length === 0) {
            toast.error("Không có dữ liệu để xuất");
            return;
        }

        const excelData = history.map((item, index) => ({
            "STT": index + 1,
            "Lệnh": item.order || `Cập nhật tiến độ ${dayjs(item.report_date * 1000).format('DD/MM')}`,
            "Thời gian": dayjs(item.report_date * 1000).format('DD/MM/YYYY HH:mm:ss'),
            "Người báo cáo": item.reporter_name || "",
            "Vị trí": item.location || "",
            "Nội dung công việc": item.work_done || "",
            "Kết luận": item.conclusion || "",
            "Ảnh hưởng": item.influence || "",
            "Đề xuất": item.proposal || "",
            "Vướng mắc": item.issues || ""
        }));

        import("xlsx").then(XLSX => {
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "TienDo");
            XLSX.writeFile(workbook, `TienDo_${constructionName.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`);
        }).catch(() => {
            toast.error("Lỗi khi xuất File Excel");
        });
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            const processedFiles = await Promise.all(files.map(file => processAndWatermark(file, location)));
            setImages([...images, ...processedFiles]);

            const newPreviews = processedFiles.map(file => URL.createObjectURL(file));
            setImagePreviews([...imagePreviews, ...newPreviews]);
        } catch (error) {
            console.error('Error processing images:', error);
            toast.error('Lỗi khi xử lý ảnh');
        } finally {
            e.target.value = '';
        }
    };

    const removeImage = (index) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);

        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setImagePreviews(newPreviews);
    };

    const removeExistingImage = (index) => {
        const newExisting = [...existingImages];
        newExisting.splice(index, 1);
        setExistingImages(newExisting);
    };

    const handleSubmit = async () => {
        if (!workDone.trim()) { toast.error('Vui lòng nhập nội dung công việc Cập nhật tiến độ'); return; }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('construction_id', selectedConstructionId);
            formData.append('work_done', workDone);
            formData.append('tasks', JSON.stringify([]));
            formData.append('progress_percentage', 0);
            formData.append('issues', issues);
            formData.append('order', order);
            formData.append('location', location);
            formData.append('conclusion', conclusion);
            formData.append('influence', influence);
            formData.append('proposal', proposal);
            formData.append('expected_completion_date', 0);
            formData.append('existing_images', JSON.stringify(existingImages));

            images.forEach((image) => {
                formData.append('images', image);
            });

            const res = editReportId
                ? await emergencyConstructionApi.updateProgress(editReportId, formData)
                : await emergencyConstructionApi.createProgress(formData);

            if (res) {
                toast.success(editReportId ? 'Cập nhật Cập nhật tiến độ thành công' : 'Cập nhật tiến độ tiến độ thành công');
                if (editReportId) {
                    navigate(`${basePath}/emergency-construction/report-history`);
                } else {
                    // Reset form
                    setWorkDone('');
                    setIssues('');
                    setOrder('');
                    setLocation('');
                    setConclusion('');
                    setInfluence('');
                    setProposal('');
                    setImages([]);
                    setImagePreviews([]);
                    setExistingImages([]);
                    // Switch to history tab to view the new report
                    setTabValue(1);
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi gửi Cập nhật tiến độ');
        } finally {
            setLoading(false);
        }
    };

    return {
        // Navigation
        navigate,
        basePath,
        // URL params
        constructionId,
        constructionName,
        editReportId,
        // Tab
        tabValue,
        setTabValue,
        handleTabChange,
        // Loading states
        loading,
        fetching,
        // Data
        history,
        constructions,
        selectedConstructionId,
        setSelectedConstructionId,
        // Form state
        workDone, setWorkDone,
        issues, setIssues,
        order, setOrder,
        location, setLocation,
        conclusion, setConclusion,
        influence, setInfluence,
        proposal, setProposal,
        images,
        imagePreviews,
        existingImages,
        // Image handlers
        handleImageChange,
        removeImage,
        removeExistingImage,
        handleOpenLocalViewer,
        // Viewer
        viewer,
        handleOpenViewer,
        handleCloseViewer,
        handlePrev,
        handleNext,
        // Actions
        handleSubmit,
        handleExportExcel,
        // Auth
        hasPermission
    };
};

export default useConstructionForm;
