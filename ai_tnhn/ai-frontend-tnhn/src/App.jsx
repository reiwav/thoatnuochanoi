import { RouterProvider } from 'react-router-dom';

// routing
import router from 'routes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';
import ThemeCustomization from 'themes';

// THIRD PARTY IMPORTS
import { Toaster } from 'react-hot-toast'; // Import Toaster
import { useEffect } from 'react';
import useAuthStore from 'store/useAuthStore';

// ==============================|| APP ||============================== //

export default function App() {
  // Always fetch latest permissions on page reload to ensure UI is up-to-date with backend role matrices
  useEffect(() => {
    useAuthStore.getState().fetchPermissions();
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
          },
        }}
      />
      <ThemeCustomization>
        <NavigationScroll>
          <RouterProvider router={router} />
        </NavigationScroll>
      </ThemeCustomization>
    </>
  );
}