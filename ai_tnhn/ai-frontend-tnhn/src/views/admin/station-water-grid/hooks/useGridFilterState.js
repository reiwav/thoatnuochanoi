import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';

export const useGridFilterState = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const initialType = searchParams.get('type') === 'lake' ? 'lake' : 'river';
    const initialMode = searchParams.get('mode') === 'flexible' ? 'flexible' : 'fixed';
    const initialStep = searchParams.get('step') || '1h';

    // Filter & Mode state synced with URL search params
    const [mode, setModeState] = useState(initialMode); // 'fixed' | 'flexible'
    const [stepCycle, setStepCycleState] = useState(initialStep); // '5m'|'10m'|'15m'|'20m'|'30m'|'1h'|'2h'
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [stationTypeFilter, setStationTypeFilterState] = useState(initialType); // 'river'|'lake'
    const [activeEditOrgs, setActiveEditOrgs] = useState({});

    const setMode = useCallback((newMode) => {
        setModeState(newMode);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('mode', newMode);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const setStepCycle = useCallback((newStep) => {
        setStepCycleState(newStep);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('step', newStep);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const setStationTypeFilter = useCallback((newType) => {
        setStationTypeFilterState(newType);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('type', newType);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const toggleOrgEditMode = useCallback((orgId) => {
        setActiveEditOrgs(prev => ({
            ...prev,
            [orgId]: !prev[orgId]
        }));
    }, []);

    return {
        mode,
        setMode,
        stepCycle,
        setStepCycle,
        selectedDate,
        setSelectedDate,
        stationTypeFilter,
        setStationTypeFilter,
        activeEditOrgs,
        toggleOrgEditMode
    };
};
