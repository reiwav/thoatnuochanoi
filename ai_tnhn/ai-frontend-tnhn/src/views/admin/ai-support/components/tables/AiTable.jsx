import React from 'react';
import PumpingStationTable from './PumpingStationTable';
import DefaultTable from './DefaultTable';
import RainTable from './RainTable';
import WaterTable from './WaterTable';
import InundationTable from './InundationTable';
import WastewaterTable from './WastewaterTable';

/**
 * AiTable - Router component that delegates rendering to the appropriate
 * table component based on the tableKey.
 * 
 * To add a custom layout for a new data type:
 * 1. Create a new component in this folder (e.g. WastewaterTable.jsx)
 * 2. Add a case for its tableKey in the TABLE_COMPONENTS map below
 */
const TABLE_COMPONENTS = {
    pumping_stations: PumpingStationTable,
    wastewater: WastewaterTable,
    wastewater_stations: WastewaterTable,
    inundations: InundationTable,
    rains: RainTable,
    list_stations_by_type: RainTable,
    lakes: WaterTable,
    rivers: WaterTable,
};

const AiTable = ({ title, data, tableKey, handleRainChart }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    const normalizedKey = String(tableKey).toLowerCase();
    const TableComponent = TABLE_COMPONENTS[normalizedKey] || DefaultTable;
    return <TableComponent title={title} data={data} handleRainChart={handleRainChart} />;
};

export default AiTable;
