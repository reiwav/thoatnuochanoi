import { useState, useEffect } from 'react';
import useAuthStore from 'store/useAuthStore';
import sluiceGateApi from 'api/sluiceGate';

const useEmployeeSluiceGate = () => {
    const { user } = useAuthStore();
    const [station, setStation] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAssignedStation = async () => {
        if (!user?.assigned_sluice_gate_id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await sluiceGateApi.get(user.assigned_sluice_gate_id);
            setStation(res || null);
        } catch (error) {
            console.error('Failed to fetch assigned sluice gate', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignedStation();
    }, [user?.assigned_sluice_gate_id]);

    return {
        user,
        station,
        loading,
        fetchAssignedStation
    };
};

export default useEmployeeSluiceGate;
