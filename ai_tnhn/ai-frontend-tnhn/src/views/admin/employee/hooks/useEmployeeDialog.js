import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import emergencyConstructionApi from 'api/emergencyConstruction';
import pumpingStationApi from 'api/pumpingStation';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';
import sluiceGateApi from 'api/sluiceGate';
import stationApi from 'api/station';
import useAuthStore from 'store/useAuthStore';
import axiosClient from 'api/axiosClient';
import * as ROLES from 'constants/role';

const initialFormData = {
    name: '',
    email: '',
    password: '',
    role: ROLES.ROLE_CONG_NHAN_CTY,
    org_id: '',
    assigned_inundation_station_ids: [],
    assigned_emergency_construction_ids: [],
    assigned_pumping_station_id: '',
    assigned_wastewater_station_id: '',
    assigned_sluice_gate_id: '',
    assigned_lake_station_ids: [],
    assigned_river_station_ids: [],
    active: true
};

const useEmployeeDialog = ({ open, employee, isEdit, defaultOrgId, canSelectOrg }) => {
    const { hasPermission, role: userRole } = useAuthStore();

    const [points, setPoints] = useState([]);
    const [constructions, setConstructions] = useState([]);
    const [pumpingStations, setPumpingStations] = useState([]);
    const [wastewaterStations, setWastewaterStations] = useState([]);
    const [sluiceGates, setSluiceGates] = useState([]);
    const [lakes, setLakes] = useState([]);
    const [rivers, setRivers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [fetchingData, setFetchingData] = useState(false);
    const [formData, setFormData] = useState({ ...initialFormData });

    useEffect(() => {
        if (open) {
            if (isEdit && employee) {
                setFormData({
                    name: employee.name || '',
                    email: employee.email || '',
                    password: '',
                    role: employee.role || ROLES.ROLE_CONG_NHAN_CTY,
                    org_id: employee.org_id || defaultOrgId,
                    assigned_inundation_station_ids: employee.assigned_inundation_station_ids || [],
                    assigned_emergency_construction_ids: employee.assigned_emergency_construction_ids || [],
                    assigned_pumping_station_id: employee.assigned_pumping_station_id || '',
                    assigned_wastewater_station_id: employee.assigned_wastewater_station_id || '',
                    assigned_sluice_gate_id: employee.assigned_sluice_gate_id || '',
                    assigned_lake_station_ids: employee.assigned_lake_station_ids || [],
                    assigned_river_station_ids: employee.assigned_river_station_ids || [],
                    active: employee.active !== undefined ? employee.active : true
                });
            } else {
                setFormData({ ...initialFormData, org_id: defaultOrgId });
            }
        }
    }, [open, isEdit, employee, defaultOrgId]);

    useEffect(() => {
        const fetchLocationData = async () => {
            if (!open) return;
            setFetchingData(true);
            try {
                const [pointsRes, consRes, pumpRes, wastewaterRes, sluiceRes, rolesRes, lakesRes, riversRes] = await Promise.all([
                    inundationApi.getPointsList({ per_page: 1000 }),
                    emergencyConstructionApi.getAll({ per_page: 1000 }),
                    pumpingStationApi.list({ per_page: 1000 }),
                    wastewaterTreatmentApi.list({ per_page: 1000 }),
                    sluiceGateApi.list({ per_page: 1000 }),
                    axiosClient.get('/admin/roles'),
                    stationApi.lake.getAll({ per_page: 1000 }),
                    stationApi.river.getAll({ per_page: 1000 })
                ]);

                // Interceptor đã bóc tách dữ liệu, nên chúng ta nhận được payload trực tiếp
                setPoints(Array.isArray(pointsRes) ? pointsRes : (pointsRes?.data || []));
                setConstructions(Array.isArray(consRes?.data) ? consRes.data : (Array.isArray(consRes) ? consRes : []));
                setPumpingStations(Array.isArray(pumpRes?.data) ? pumpRes.data : (Array.isArray(pumpRes) ? pumpRes : []));
                setWastewaterStations(Array.isArray(wastewaterRes?.data) ? wastewaterRes.data : (Array.isArray(wastewaterRes) ? wastewaterRes : []));
                setSluiceGates(Array.isArray(sluiceRes?.data) ? sluiceRes.data : (Array.isArray(sluiceRes) ? sluiceRes : []));
                setRoles(Array.isArray(rolesRes) ? rolesRes : []);
                setLakes(Array.isArray(lakesRes) ? lakesRes : (lakesRes?.data || []));
                setRivers(Array.isArray(riversRes) ? riversRes : (riversRes?.data || []));
            } catch (err) {
                console.error('Lỗi tải dữ liệu:', err);
            } finally {
                setFetchingData(false);
            }
        };

        fetchLocationData();
    }, [open]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Nếu không có quyền chọn đơn vị, luôn giữ org_id theo mặc định
            if (field === 'org_id' && !canSelectOrg) {
                newData.org_id = defaultOrgId;
            }

            return newData;
        });
    };

    const handleSave = (onSubmit) => {
        if (!formData.name) return toast.error('Vui lòng nhập tên');
        if (!formData.email) return toast.error('Vui lòng nhập email');
        if (userRole !== 'admin_org' && !formData.org_id) return toast.error('Vui lòng chọn công ty');
        if (!isEdit && !formData.password) return toast.error('Vui lòng nhập mật khẩu');
        onSubmit(formData);
    };

    const isEmployeeRole = roles.find(r => r.code === formData.role)?.is_employee;

    return {
        // Auth
        hasPermission,
        userRole,

        // Form data
        formData,
        handleChange,
        handleSave,

        // Metadata lists
        points,
        constructions,
        pumpingStations,
        wastewaterStations,
        sluiceGates,
        lakes,
        rivers,
        roles,
        fetchingData,



        // Derived
        isEmployeeRole,
    };
};

export default useEmployeeDialog;
