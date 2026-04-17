import React from 'react';
import useAuthStore from 'store/useAuthStore';

/**
 * PermissionGuard
 * @param {string} permission - The permission string to check (e.g., 'user:edit')
 * @param {React.ReactNode} children - The content to render if permitted
 * @param {React.ReactNode} fallback - Optional content to render if not permitted
 */
const PermissionGuard = ({ permission, children, fallback = null }) => {
    const { hasPermission } = useAuthStore();
    
    if (hasPermission(permission)) {
        return <>{children}</>;
    }
    
    return <>{fallback}</>;
};

export default PermissionGuard;
