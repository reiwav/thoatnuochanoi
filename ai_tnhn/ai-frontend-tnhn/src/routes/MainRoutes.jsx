import { lazy } from 'react';
import { Outlet } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import ContextOutlet from 'layout/ContextOutlet';
import Loadable from 'ui-component/Loadable';

const EmployeePage = Loadable(lazy(() => import('views/admin/employee/index')));
const OrganizationPage = Loadable(lazy(() => import('views/admin/organization')));
const InundationForm = Loadable(lazy(() => import('views/employee/inundation/InundationForm')));
const EmployeeInundationDashboard = Loadable(lazy(() => import('views/employee/inundation/EmployeeInundationDashboard')));
const AdminInundationDashboard = Loadable(lazy(() => import('views/admin/inundation/AdminInundationDashboard')));
const StationRainList = Loadable(lazy(() => import('views/admin/station/rain')));
const StationRainSummary = Loadable(lazy(() => import('views/admin/station-rain-summary')));
const StationWaterSummary = Loadable(lazy(() => import('views/admin/station-water-summary')));
const StationPumpingSummary = Loadable(lazy(() => import('views/admin/station-pumping-summary')));
const StationRainCompare = Loadable(lazy(() => import('views/admin/station-rain-compare')));
const StationRiverList = Loadable(lazy(() => import('views/admin/station/river')));
const StationLakeList = Loadable(lazy(() => import('views/admin/station/lake')));
const StationInundationList = Loadable(lazy(() => import('views/admin/station/inundation')));
const StationHistory = Loadable(lazy(() => import('views/admin/station/shared/StationHistory')));
const InundationStationHistory = Loadable(lazy(() => import('views/admin/station/inundation/History')));
const InundationHistoryDetail = Loadable(lazy(() => import('views/employee/inundation/InundationHistoryDetail')));
const AiSupportPage = Loadable(lazy(() => import('views/admin/ai-support')));
const AiContractPage = Loadable(lazy(() => import('views/admin/ai-contract')));
const EmergencyConstructionPage = Loadable(lazy(() => import('views/admin/emergency-construction')));
const EmployeePumpingStationDashboard = Loadable(lazy(() => import('views/employee/pumping-station/EmployeePumpingStationDashboard')));
const ConstructionReportingPage = Loadable(lazy(() => import('views/employee/emergency-construction/ConstructionReporting')));
const ConstructionFormPage = Loadable(lazy(() => import('views/employee/emergency-construction/ConstructionForm')));
const ConstructionProgressHistoryPage = Loadable(lazy(() => import('views/admin/emergency-construction/ConstructionProgressHistory')));
// const InundationAdminList = Loadable(lazy(() => import('views/admin/inundation/InundationAdminList')));
const InundationYearlyHistory = Loadable(lazy(() => import('views/admin/inundation/InundationYearlyHistory')));
const ContractCategoryPage = Loadable(lazy(() => import('views/admin/contract-category')));
const ContractPage = Loadable(lazy(() => import('views/admin/contract')));
const RoleMatrixPage = Loadable(lazy(() => import('views/admin/role-matrix')));
const RoleListPage = Loadable(lazy(() => import('views/admin/role/RoleList')));
const PumpingStationPage = Loadable(lazy(() => import('views/admin/pumping-station')));
const FloodLevelSetting = Loadable(lazy(() => import('views/admin/setting/FloodLevelSetting')));
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
        { path: 'inundation', element: <AdminInundationDashboard /> },
        { path: 'inundation-list', element: <AdminInundationDashboard /> },
        { path: 'inundation/form', element: <InundationForm /> },
        { path: 'station/rain/summary', element: <StationRainSummary /> },
        { path: 'station/water/summary', element: <StationWaterSummary /> },
        { path: 'station/pumping/summary', element: <StationPumpingSummary /> },
        { path: 'station/rain/compare', element: <StationRainCompare /> },
        { path: 'station/rain/list', element: <StationRainList /> },
        { path: 'station/rain/history', element: <StationHistory type="rain" /> },
        { path: 'station/river/list', element: <StationRiverList /> },
        { path: 'station/river/history', element: <StationHistory type="river" /> },
        { path: 'station/lake/list', element: <StationLakeList /> },
        { path: 'station/lake/history', element: <StationHistory type="lake" /> },
        { path: 'station/inundation/list', element: <StationInundationList /> },
        { path: 'station/inundation/history', element: <InundationStationHistory /> },
        { path: 'station/inundation/yearly', element: <InundationYearlyHistory /> },
        { path: 'cua-pai', element: <UnderDevelopment /> },
        { path: 'tram-bom', element: <PumpingStationPage /> },
        { path: 'sa-hinh-ngap', element: <UnderDevelopment /> },
        { path: 'ai-support', element: <AiSupportPage /> },
        { path: 'ai-contract', element: <AiContractPage /> },
        { path: 'contract-category', element: <ContractCategoryPage /> },
        { path: 'contract', element: <ContractPage /> },
        { path: 'role-matrix', element: <RoleMatrixPage /> },
        { path: 'role', element: <RoleListPage /> },
        { path: 'setting/flood-levels', element: <FloodLevelSetting /> }
      ]
    },
    {
      path: 'company',
      element: <ContextOutlet />,
      children: [
        { path: 'emergency-construction', element: <EmergencyConstructionPage /> },
        { path: 'inundation', element: <EmployeeInundationDashboard /> },
        { path: 'inundation/form', element: <InundationForm /> },
        { path: 'emergency-construction/dashboard', element: <ConstructionReportingPage /> },
        { path: 'emergency-construction/form', element: <ConstructionFormPage /> },
        { path: 'station/rain/summary', element: <StationRainSummary /> },
        { path: 'station/water/summary', element: <StationWaterSummary /> },
        { path: 'station/rain/compare', element: <StationRainCompare /> },
        { path: 'station/inundation/history', element: <InundationHistoryDetail /> },
        { path: 'tram-bom', element: <EmployeePumpingStationDashboard /> }
      ]
    }
  ]
};

export default MainRoutes;
