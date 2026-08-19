import React from 'react';
import { TableRow, TableCell, Skeleton } from '@mui/material';

const HistorySkeleton = ({ isPumping, rowCount = 5 }) => {
    return (
        <>
            {Array.from(new Array(rowCount)).map((_, idx) => (
                <TableRow key={idx}>
                    <TableCell><Skeleton variant="text" width="90%" height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width="80%" height={24} /></TableCell>
                    {isPumping && (
                        <>
                            <TableCell align="center">
                                <Skeleton variant="rounded" width={52} height={34} sx={{ mx: 'auto', borderRadius: 2 }} />
                            </TableCell>
                            <TableCell align="center">
                                <Skeleton variant="rounded" width={52} height={34} sx={{ mx: 'auto', borderRadius: 2 }} />
                            </TableCell>
                            <TableCell align="center">
                                <Skeleton variant="rounded" width={52} height={34} sx={{ mx: 'auto', borderRadius: 2 }} />
                            </TableCell>
                            <TableCell align="center">
                                <Skeleton variant="rounded" width={52} height={34} sx={{ mx: 'auto', borderRadius: 2 }} />
                            </TableCell>
                        </>
                    )}
                    <TableCell><Skeleton variant="text" width="95%" height={24} /></TableCell>
                </TableRow>
            ))}
        </>
    );
};

export default HistorySkeleton;
