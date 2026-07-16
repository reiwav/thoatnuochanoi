import React from 'react';
import MultiAssignmentSelector from './MultiAssignmentSelector';
import SingleAssignmentSelector from './SingleAssignmentSelector';

const EmployeeAssignmentsSection = ({
    formData,
    handleChange,
    points = [],
    constructions = [],
    pumpingStations = [],
    wastewaterStations = [],
    sluiceGates = [],
    lakes = [],
    rivers = []
}) => {
    const filterByOrg = (list) => {
        const targetOrgId = formData.org_id;
        if (!targetOrgId) return list;
        return list.filter(item =>
            item.share_all ||
            item.org_id === targetOrgId ||
            (Array.isArray(item.shared_org_ids) && item.shared_org_ids.includes(targetOrgId))
        );
    };

    return (
        <>
            {/* Điểm ngập được giao */}
            <MultiAssignmentSelector
                title="Chọn điểm ngập"
                unitLabel="điểm"
                items={filterByOrg(points)}
                selectedIds={formData.assigned_inundation_station_ids || []}
                onConfirm={(newIds) => handleChange('assigned_inundation_station_ids', newIds)}
                labelField="name"
            />

            {/* Hồ được giao */}
            <MultiAssignmentSelector
                title="Chọn hồ"
                unitLabel="hồ"
                items={filterByOrg(lakes)}
                selectedIds={formData.assigned_lake_station_ids || []}
                onConfirm={(newIds) => handleChange('assigned_lake_station_ids', newIds)}
                labelField="TenTram"
            />

            {/* Sông được giao */}
            <MultiAssignmentSelector
                title="Chọn sông"
                unitLabel="sông"
                items={filterByOrg(rivers)}
                selectedIds={formData.assigned_river_station_ids || []}
                onConfirm={(newIds) => handleChange('assigned_river_station_ids', newIds)}
                labelField="TenTram"
            />

            {/* Công trình được giao */}
            <MultiAssignmentSelector
                title="Chọn công trình khẩn cấp"
                unitLabel="công trình"
                items={filterByOrg(constructions)}
                selectedIds={formData.assigned_emergency_construction_ids || []}
                onConfirm={(newIds) => handleChange('assigned_emergency_construction_ids', newIds)}
                labelField="name"
            />

            {/* Trạm bơm được giao */}
            <SingleAssignmentSelector
                title="Trạm bơm được giao"
                label="Chọn trạm bơm"
                value={formData.assigned_pumping_station_id}
                onChange={(val) => handleChange('assigned_pumping_station_id', val)}
                items={filterByOrg(pumpingStations)}
                labelField="name"
            />

            {/* Trạm XLNT được giao */}
            <SingleAssignmentSelector
                title="Trạm XLNT được giao"
                label="Chọn trạm XLNT"
                value={formData.assigned_wastewater_station_id}
                onChange={(val) => handleChange('assigned_wastewater_station_id', val)}
                items={filterByOrg(wastewaterStations)}
                labelField="name"
            />

            {/* Cửa phai được giao */}
            <SingleAssignmentSelector
                title="Cửa phai được giao"
                label="Chọn cửa phai"
                value={formData.assigned_sluice_gate_id}
                onChange={(val) => handleChange('assigned_sluice_gate_id', val)}
                items={filterByOrg(sluiceGates)}
                labelField="name"
            />
        </>
    );
};

export default EmployeeAssignmentsSection;

