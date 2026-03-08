import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';

const EmployeePage = Loadable(lazy(() => import('views/admin/employee')));
const OrganizationPage = Loadable(lazy(() => import('views/admin/organization')));
const InundationForm = Loadable(lazy(() => import('views/admin/inundation/InundationForm')));
const InundationDashboard = Loadable(lazy(() => import('views/admin/inundation/InundationDashboard')));
const StationRainList = Loadable(lazy(() => import('views/admin/station/StationRainList')));
const StationRiverList = Loadable(lazy(() => import('views/admin/station/StationRiverList')));
const StationLakeList = Loadable(lazy(() => import('views/admin/station/StationLakeList')));
const StationInundationList = Loadable(lazy(() => import('views/admin/station/StationInundationList')));
const StationHistory = Loadable(lazy(() => import('views/admin/station/StationHistory')));
const InundationStationHistory = Loadable(lazy(() => import('views/admin/station/InundationStationHistory')));
const AiSupportPage = Loadable(lazy(() => import('views/admin/ai-support')));
const EmergencyConstructionPage = Loadable(lazy(() => import('views/admin/emergency-construction')));
const ConstructionReportingPage = Loadable(lazy(() => import('views/admin/emergency-construction/ConstructionReporting')));
const ConstructionFormPage = Loadable(lazy(() => import('views/admin/emergency-construction/ConstructionForm')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/',
      element: <InundationDashboard />
    },
    {
      path: 'admin',
      children: [
        { path: 'employee', element: <EmployeePage /> },
        { path: 'organization', element: <OrganizationPage /> },
        { path: 'emergency-construction', element: <EmergencyConstructionPage /> },
        { path: 'emergency-construction/dashboard', element: <ConstructionReportingPage /> },
        { path: 'emergency-construction/form', element: <ConstructionFormPage /> },
        { path: 'inundation', element: <InundationDashboard /> },
        { path: 'inundation/form', element: <InundationForm /> },
        { path: 'station/rain/list', element: <StationRainList /> },
        { path: 'station/rain/history', element: <StationHistory type="rain" /> },
        { path: 'station/river/list', element: <StationRiverList /> },
        { path: 'station/river/history', element: <StationHistory type="river" /> },
        { path: 'station/lake/list', element: <StationLakeList /> },
        { path: 'station/lake/history', element: <StationHistory type="lake" /> },
        { path: 'station/inundation/list', element: <StationInundationList /> },
        { path: 'station/inundation/history', element: <InundationStationHistory /> },
        { path: 'ai-support', element: <AiSupportPage /> }
      ]
    },
    {
      path: 'company',
      children: [
        { path: 'emergency-construction', element: <EmergencyConstructionPage /> },
        { path: 'inundation', element: <InundationDashboard /> },
        { path: 'inundation/form', element: <InundationForm /> },
        { path: 'emergency-construction/dashboard', element: <ConstructionReportingPage /> },
        { path: 'emergency-construction/form', element: <ConstructionFormPage /> }
      ]
    }
  ]
};

export default MainRoutes;
