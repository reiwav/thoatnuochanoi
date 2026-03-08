import { lazy } from 'react';

// project imports
import Loadable from 'ui-component/Loadable';
import MinimalLayout from 'layout/MinimalLayout';

const LoginPage = Loadable(lazy(() => import('views/pages/authentication/Login')));
const EmployeeLoginPage = Loadable(lazy(() => import('views/pages/authentication/EmployeeLogin')));

// ==============================|| AUTHENTICATION ROUTING ||============================== //

const AuthenticationRoutes = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: '/pages/login',
      element: <LoginPage />
    },
    {
      path: '/employee/login',
      element: <EmployeeLoginPage />
    }
  ]
};

export default AuthenticationRoutes;
