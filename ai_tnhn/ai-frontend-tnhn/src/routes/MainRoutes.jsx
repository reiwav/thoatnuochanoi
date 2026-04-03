import { lazy } from 'react';
import { Outlet } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import ContextOutlet from 'layout/ContextOutlet';
import Loadable from 'ui-component/Loadable';

const EmployeePage = Loadable(lazy(() => import('views/admin/employee')));
const OrganizationPage = Loadable(lazy(() => import('views/admin/organization')));
const InundationForm = Loadable(lazy(() => import('views/employee/inundation/InundationForm')));
const InundationDashboard = Loadable(lazy(() => import('views/employee/inundation/InundationDashboard')));
const StationRainList = Loadable(lazy(() => import('views/admin/station/StationRainList')));
const StationRainSummary = Loadable(lazy(() => import('views/admin/station-rain-summary')));
const StationWaterSummary = Loadable(lazy(() => import('views/admin/station-water-summary')));
const StationRainCompare = Loadable(lazy(() => import('views/admin/station-rain-compare')));
const StationRiverList = Loadable(lazy(() => import('views/admin/station/StationRiverList')));
const StationLakeList = Loadable(lazy(() => import('views/admin/station/StationLakeList')));
const StationInundationList = Loadable(lazy(() => import('views/admin/station/StationInundationList')));
const StationHistory = Loadable(lazy(() => import('views/admin/station/StationHistory')));
const InundationStationHistory = Loadable(lazy(() => import('views/admin/station/InundationStationHistory')));
const AiSupportPage = Loadable(lazy(() => import('views/admin/ai-support')));
const AiContractPage = Loadable(lazy(() => import('views/admin/ai-contract')));
const EmergencyConstructionPage = Loadable(lazy(() => import('views/admin/emergency-construction')));
const ConstructionReportingPage = Loadable(lazy(() => import('views/employee/emergency-construction/ConstructionReporting')));
const ConstructionFormPage = Loadable(lazy(() => import('views/employee/emergency-construction/ConstructionForm')));
const ConstructionProgressHistoryPage = Loadable(lazy(() => import('views/admin/emergency-construction/ConstructionProgressHistory')));
const InundationAdminList = Loadable(lazy(() => import('views/admin/inundation/InundationAdminList')));
const ContractCategoryPage = Loadable(lazy(() => import('views/admin/contract-category')));
const ContractPage = Loadable(lazy(() => import('views/admin/contract')));
const PumpingStationPage = Loadable(lazy(() => import('views/admin/pumping-station')));
const UnderDevelopment = Loadable(lazy(() => import('views/pages/under-development')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '/',
      element: <AiSupportPage />
    },
    {
      path: 'admin',
      element: <ContextOutlet />,
      children: [
        { path: 'employee', element: <EmployeePage /> },
        { path: 'organization', element: <OrganizationPage /> },
        { path: 'emergency-construction', element: <EmergencyConstructionPage /> },
        { path: 'emergency-construction/dashboard', element: <ConstructionReportingPage /> },
        { path: 'emergency-construction/report-history', element: <ConstructionProgressHistoryPage /> },
        { path: 'emergency-construction/form', element: <ConstructionFormPage /> },
        { path: 'inundation', element: <InundationDashboard /> },
        { path: 'inundation-list', element: <InundationAdminList /> },
        { path: 'inundation/form', element: <InundationForm /> },
        { path: 'station/rain/summary', element: <StationRainSummary /> },
        { path: 'station/water/summary', element: <StationWaterSummary /> },
        { path: 'station/rain/compare', element: <StationRainCompare /> },
        { path: 'station/rain/list', element: <StationRainList /> },
        { path: 'station/rain/history', element: <StationHistory type="rain" /> },
        { path: 'station/river/list', element: <StationRiverList /> },
        { path: 'station/river/history', element: <StationHistory type="river" /> },
        { path: 'station/lake/list', element: <StationLakeList /> },
        { path: 'station/lake/history', element: <StationHistory type="lake" /> },
        { path: 'station/inundation/list', element: <StationInundationList /> },
        { path: 'station/inundation/history', element: <InundationStationHistory /> },
        { path: 'cua-pai', element: <UnderDevelopment /> },
        { path: 'tram-bom', element: <PumpingStationPage /> },
        { path: 'sa-hinh-ngap', element: <UnderDevelopment /> },
        { path: 'ai-support', element: <AiSupportPage /> },
        { path: 'ai-contract', element: <AiContractPage /> },
        { path: 'contract-category', element: <ContractCategoryPage /> },
        { path: 'contract', element: <ContractPage /> }
      ]
    },
    {
      path: 'company',
      element: <ContextOutlet />,
      children: [
        { path: 'emergency-construction', element: <EmergencyConstructionPage /> },
        { path: 'inundation', element: <InundationDashboard /> },
        { path: 'inundation/form', element: <InundationForm /> },
        { path: 'emergency-construction/dashboard', element: <ConstructionReportingPage /> },
        { path: 'emergency-construction/form', element: <ConstructionFormPage /> },
        { path: 'station/rain/summary', element: <StationRainSummary /> },
        { path: 'station/water/summary', element: <StationWaterSummary /> },
        { path: 'station/rain/compare', element: <StationRainCompare /> },
        { path: 'tram-bom', element: <PumpingStationPage /> }
      ]
    }
  ]
};

export default MainRoutes;
