import React, { useEffect, useState, useMemo } from 'react';
import { MenuItem, TextField, CircularProgress } from '@mui/material';
import organizationApi from 'api/organization';
import useAuthStore from 'store/useAuthStore';

const OrganizationSelect = ({
    value,
    onChange,
    label = "Đơn vị quản lý",
    size = "small",
    fullWidth = true,
    showAll = true,
    disabled: customDisabled = false,
    sx = {},
    InputProps: customInputProps = {}
}) => {
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user, role, isCompany } = useAuthStore();

    // Role động: Dựa vào flag isCompany từ backend trả về trong token
    // Super Admin mặc định là Company Level
    const isCompanyLevel = useMemo(() => {
        const result = isCompany || role === 'super_admin';
        return result;
    }, [isCompany, role, user?.org_id]);

    useEffect(() => {
        const fetchOrgs = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const res = await organizationApi.getSelectionList();
                if (res.data?.status === 'success') {
                    const data = res.data.data;
                    const list = Array.isArray(data) ? data : [...(data.primary || []), ...(data.shared || [])];

                    // Deduplicate by ID
                    const uniqueList = Array.from(new Map(list.map(item => [item.id, item])).values());
                    setOrganizations(uniqueList);
                }
            } catch (error) {
                console.error('Failed to fetch organizations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrgs();
    }, [user?.id]);

    const isLocked = !isCompanyLevel && !!user?.org_id;
    const currentValue = isLocked ? user.org_id : value;

    useEffect(() => {
        // Force the value to user's org_id if locked
        if (isLocked && user?.org_id && value !== user.org_id) {
            onChange({ target: { value: user.org_id } });
        }
    }, [isLocked, user?.org_id, value, onChange]);

    return (
        <TextField
            select
            fullWidth={fullWidth}
            size={size}
            label={label}
            value={currentValue}
            onChange={onChange}
            disabled={isLocked || loading || customDisabled}
            sx={{ minWidth: 200, ...sx }}
            InputProps={{
                sx: { borderRadius: 3, ...customInputProps?.sx },
                ...customInputProps,
                endAdornment: loading ? <CircularProgress color="inherit" size={20} sx={{ mr: 3 }} /> : customInputProps?.endAdornment || null
            }}
        >
            {showAll && isCompanyLevel && <MenuItem value="">Tất cả đơn vị</MenuItem>}
            {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                    {org.name}
                </MenuItem>
            ))}
            {!loading && user?.org_id && !isCompanyLevel && !organizations.some(o => o.id === user.org_id) && (
                <MenuItem key={user.org_id} value={user.org_id}>Đơn vị của tôi</MenuItem>
            )}
        </TextField>
    );
};

export default OrganizationSelect;
