import { useState, useEffect } from 'react';
import useAuthStore from 'store/useAuthStore';
import wastewaterTreatmentApi from 'api/wastewaterTreatment';

const useEmployeeWastewater = () => {
    const { user } = useAuthStore();
    const [station, setStation] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAssignedStation = async () => {
        if (!user?.assigned_wastewater_station_id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await wastewaterTreatmentApi.get(user.assigned_wastewater_station_id);
            setStation(res || null);
        } catch (error) {
            console.error('Failed to fetch assigned station', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignedStation();
    }, [user?.assigned_wastewater_station_id]);

    return {
        user,
        station,
        loading,
        fetchAssignedStation
    };
};

export default useEmployeeWastewater;
