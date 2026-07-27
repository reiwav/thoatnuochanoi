import { useMemo } from 'react';

/**
 * Custom hook to handle station filtering by type (river/lake) and grouping by organization.
 */
export const useGridStationGroups = (stations, organizations, stationTypeFilter) => {
    // Filtered stations by type
    const filteredStations = useMemo(() => {
        return stations.filter(s => s.type === stationTypeFilter);
    }, [stations, stationTypeFilter]);

    const riverCount = useMemo(() => stations.filter(s => s.type === 'river').length, [stations]);
    const lakeCount = useMemo(() => stations.filter(s => s.type === 'lake').length, [stations]);

    // Group stations by managing organization (Xí nghiệp)
    const groupedStations = useMemo(() => {
        const orgMap = {};
        organizations.forEach(o => {
            if (o.id) orgMap[o.id] = o;
        });

        const groupsMap = {};
        const unassigned = [];

        filteredStations.forEach(st => {
            const orgId = st.org_id;
            const orgObj = orgMap[orgId];
            const orgName = orgObj?.name || orgObj?.name_display || st.org_name;

            if (orgId && orgName) {
                if (!groupsMap[orgId]) {
                    groupsMap[orgId] = {
                        orgId,
                        orgName,
                        stations: []
                    };
                }
                groupsMap[orgId].stations.push(st);
            } else {
                unassigned.push(st);
            }
        });

        const result = Object.values(groupsMap).sort((a, b) => 
            (a.orgName || '').localeCompare(b.orgName || '', 'vi', { numeric: true, sensitivity: 'base' })
        );

        if (unassigned.length > 0) {
            result.push({
                orgId: 'unassigned',
                orgName: 'Trạm khác / Chưa phân xí nghiệp',
                stations: unassigned
            });
        }

        return result;
    }, [filteredStations, organizations]);

    return {
        filteredStations,
        groupedStations,
        riverCount,
        lakeCount
    };
};
