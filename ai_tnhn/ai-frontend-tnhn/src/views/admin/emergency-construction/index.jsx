import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import ConstructionList from './ConstructionList';
import ConstructionHistory from './ConstructionHistory';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const EmergencyConstruction = () => {
    const [value, setValue] = useState(0);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <MainCard title="Quản lý công trình khẩn cấp">
            <Box sx={{ width: '100%' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={handleChange} aria-label="emergency construction tabs">
                        <Tab label="Danh sách công trình" />
                        <Tab label="Lịch sử thay đổi" />
                    </Tabs>
                </Box>
                <TabPanel value={value} index={0}>
                    <ConstructionList />
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <ConstructionHistory />
                </TabPanel>
            </Box>
        </MainCard>
    );
};

export default EmergencyConstruction;
