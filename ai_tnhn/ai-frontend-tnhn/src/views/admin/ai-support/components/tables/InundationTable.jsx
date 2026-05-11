import React from 'react';
import DefaultTable from './DefaultTable';

const InundationTable = ({ title, data }) => {
    // TODO: Implement custom layout for inundation points
    // For now, fallback to the default table layout
    return <DefaultTable title={title} data={data} />;
};

export default InundationTable;
