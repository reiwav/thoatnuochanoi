import { RouterProvider } from 'react-router-dom';

// routing
import router from 'routes';

// project imports
import NavigationScroll from 'layout/NavigationScroll';
import ThemeCustomization from 'themes';

// THIRD PARTY IMPORTS
import { Toaster } from 'react-hot-toast'; // Import Toaster

// ==============================|| APP ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      <NavigationScroll>
        <>
          {/* Đặt Toaster ở đây để nó có thể hiển thị ở bất cứ đâu trong ứng dụng */}
          <Toaster 
            position="top-right" 
            reverseOrder={false} 
            containerStyle={{
              // Dialog của MUI thường có z-index 1300, 
              // đặt 9999 để chắc chắn thông báo luôn nằm trên cùng.
              zIndex: 9999, 
            }}
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#333',
              },
            }}
          />
          <RouterProvider router={router} />
        </>
      </NavigationScroll>
    </ThemeCustomization>
  );
}