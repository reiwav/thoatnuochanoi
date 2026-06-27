import React, { useState } from 'react';
import { Grid } from '@mui/material';
import contractApi from 'api/contract';
import { toast } from 'react-hot-toast';
import StageExplorer from './components/StageExplorer';
import StageWorkspace from './components/StageWorkspace';

const ContractStages = ({ 
    values, 
    setValues, 
    uploading, 
    setUploading, 
    stages, 
    handleStageChange, 
    addStage, 
    removeStage 
}) => {
    const [activeStageIdx, setActiveStageIdx] = useState(0);
    const [stageTabs, setStageTabs] = useState({});

    const handleRemoveStageWithSelection = (index) => {
        removeStage(index);
        setActiveStageIdx(prev => {
            if (prev >= stages.length - 1) {
                return Math.max(0, stages.length - 2);
            }
            return prev;
        });
    };

    const handleStageTabChange = (index, newValue) => {
        setStageTabs(prev => ({
            ...prev,
            [index]: newValue
        }));
    };

    const handleRecordFileUpload = async (e, stageIndex, recordType, recordIndex) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        setUploading(true);
        try {
            let currentFolderId = values.drive_folder_id;
            let currentFolderLink = values.drive_folder_link;

            if (!currentFolderId) {
                const prepRes = await contractApi.prepareFolder({
                    category_id: values.category_id
                });
                if (prepRes && prepRes.drive_folder_id) {
                    currentFolderId = prepRes.drive_folder_id;
                    currentFolderLink = prepRes.drive_folder_link;
                    setValues(prev => ({
                        ...prev,
                        drive_folder_id: currentFolderId,
                        drive_folder_link: currentFolderLink
                    }));
                }
            }

            if (!currentFolderId) throw new Error("Không thể khởi tạo thư mục Drive");

            const uploadedLinks = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                
                const res = await contractApi.uploadToFolder(currentFolderId, formData);
                if (res && res.link) {
                    uploadedLinks.push(res.link);
                }
            }
            
            if (uploadedLinks.length > 0) {
                toast.success(`Đã tải lên ${uploadedLinks.length} bản scan thành công`);
                
                const stagesList = [...values.stages];
                if (recordType === 'acceptance') {
                    const list = [...(stagesList[stageIndex].acceptance_records || [])];
                    list[recordIndex].scan_files = [...(list[recordIndex].scan_files || []), ...uploadedLinks];
                    stagesList[stageIndex].acceptance_records = list;
                } else if (recordType === 'payment') {
                    const list = [...(stagesList[stageIndex].payment_records || [])];
                    list[recordIndex].scan_files = [...(list[recordIndex].scan_files || []), ...uploadedLinks];
                    stagesList[stageIndex].payment_records = list;
                }
                setValues(prev => ({ ...prev, stages: stagesList }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Lỗi khi tải lên tệp');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveRecordFile = (stageIndex, recordType, recordIndex, fileIndex) => {
        const stagesList = [...values.stages];
        if (recordType === 'acceptance') {
            const list = [...(stagesList[stageIndex].acceptance_records || [])];
            list[recordIndex].scan_files = list[recordIndex].scan_files.filter((_, idx) => idx !== fileIndex);
            stagesList[stageIndex].acceptance_records = list;
        } else if (recordType === 'payment') {
            const list = [...(stagesList[stageIndex].payment_records || [])];
            list[recordIndex].scan_files = list[recordIndex].scan_files.filter((_, idx) => idx !== fileIndex);
            stagesList[stageIndex].payment_records = list;
        }
        setValues({ ...values, stages: stagesList });
    };

    const handleAppendixFileUpload = async (e, stageIndex, appendixIndex) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        setUploading(true);
        try {
            let currentFolderId = values.drive_folder_id;
            let currentFolderLink = values.drive_folder_link;

            if (!currentFolderId) {
                const prepRes = await contractApi.prepareFolder({
                    category_id: values.category_id
                });
                if (prepRes && prepRes.drive_folder_id) {
                    currentFolderId = prepRes.drive_folder_id;
                    currentFolderLink = prepRes.drive_folder_link;
                    setValues(prev => ({
                        ...prev,
                        drive_folder_id: currentFolderId,
                        drive_folder_link: currentFolderLink
                    }));
                }
            }

            if (!currentFolderId) throw new Error("Không thể khởi tạo thư mục Drive");

            const newUploadedFiles = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                
                const res = await contractApi.uploadToFolder(currentFolderId, formData);
                if (res && res.file_id) {
                    newUploadedFiles.push({
                        id: res.file_id,
                        name: res.name,
                        link: res.link
                    });
                }
            }
            
            if (newUploadedFiles.length > 0) {
                toast.success(`Đã tải lên ${newUploadedFiles.length} tệp cho phụ lục thành công`);
                const stagesList = [...values.stages];
                const list = [...(stagesList[stageIndex].appendices || [])];
                list[appendixIndex].files = [...(list[appendixIndex].files || []), ...newUploadedFiles];
                stagesList[stageIndex].appendices = list;
                setValues(prev => ({ ...prev, stages: stagesList }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Lỗi khi tải lên tệp');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveAppendixFile = (stageIndex, appendixIndex, fileIndex) => {
        const stagesList = [...values.stages];
        const list = [...(stagesList[stageIndex].appendices || [])];
        list[appendixIndex].files = list[appendixIndex].files.filter((_, idx) => idx !== fileIndex);
        stagesList[stageIndex].appendices = list;
        setValues({ ...values, stages: stagesList });
    };

    const activeStage = stages[activeStageIdx] || stages[0];

    return (
        <Grid container spacing={2} alignItems="stretch" sx={{ width: '100%', m: 0 }}>
            {/* Left Column: Explorer List */}
            <StageExplorer
                stages={stages}
                activeStageIdx={activeStageIdx}
                setActiveStageIdx={setActiveStageIdx}
                addStage={addStage}
                handleRemoveStageWithSelection={handleRemoveStageWithSelection}
            />

            {/* Right Column: Workspace Details */}
            <StageWorkspace
                activeStage={activeStage}
                activeStageIdx={activeStageIdx}
                values={values}
                setValues={setValues}
                uploading={uploading}
                setUploading={setUploading}
                handleStageChange={handleStageChange}
                stageTabs={stageTabs}
                handleStageTabChange={handleStageTabChange}
                handleAppendixFileUpload={handleAppendixFileUpload}
                handleRemoveAppendixFile={handleRemoveAppendixFile}
                handleRecordFileUpload={handleRecordFileUpload}
                handleRemoveRecordFile={handleRemoveRecordFile}
            />
        </Grid>
    );
};

export default ContractStages;
