import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useEffect } from 'react';

// material-ui
import Alert from '@mui/material/Alert';

// ==============================|| ELEMENT ERROR - COMMON ||============================== //

export default function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    // Automatically reload the page if it's a chunk load error / module import error
    // This happens when a new version is deployed and the client still has old chunks cached.
    if (error && error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('failed to fetch dynamically imported module') ||
        message.includes('mime type') ||
        message.includes('loading chunk') ||
        message.includes('importing a module script failed')
      ) {
        window.location.reload();
      }
    }
  }, [error]);

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <Alert severity="error">Error 404 - This page doesn't exist!</Alert>;
    }

    if (error.status === 401) {
      return <Alert severity="error">Error 401 - You aren't authorized to see this</Alert>;
    }

    if (error.status === 503) {
      return <Alert severity="error">Error 503 - Looks like our API is down</Alert>;
    }

    if (error.status === 418) {
      return <Alert severity="error">Error 418 - Contact administrator</Alert>;
    }
  }

  return <Alert severity="error">Đã có lỗi xảy ra hoặc phiên bản mới vừa được cập nhật. Vui lòng tải lại trang (F5).</Alert>;
}
