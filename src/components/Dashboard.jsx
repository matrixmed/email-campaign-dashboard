import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import MatrixSignIn from './MatrixSignIn';
import CampaignPerformancePage from '../pages/CampaignPerformancePage';
import AnalyticsPage from '../pages/AnalyticsPage';
import ReportsPage from '../pages/ReportsPage';
import BrandManagementPage from '../pages/BrandManagementPage';
import CMIContractsPage from '../pages/CMIContractsPage';
import JournalAnalysisPage from '../pages/JournalAnalysisPage';
import BasisOptimizationPage from '../pages/BasisOptimizationPage';
import TrackingPage from '../pages/TrackingPage';
import ABTestingPage from '../pages/ABTestingPage';
import ContentPerformancePage from '../pages/ContentPerformancePage';
import AudienceAnalyticsPage from '../pages/AudienceAnalyticsPage';
import DashboardCanvas from './dashboardBuilder/DashboardCanvas';

const Dashboard = ({ isAuthenticated, onAuthenticated }) => {
  return (
    <AppLayout>
      {!isAuthenticated ? (
        <MatrixSignIn onAuthenticated={onAuthenticated} />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/campaigns" replace />} />
          <Route path="/campaigns" element={<CampaignPerformancePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard-builder" element={<DashboardCanvas />} />
          <Route path="/ab-testing" element={<ABTestingPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audience" element={<AudienceAnalyticsPage />} />
          <Route path="/basis" element={<BasisOptimizationPage />} />
          <Route path="/content" element={<ContentPerformancePage />} />
          <Route path="/content-analysis" element={<JournalAnalysisPage />} />
          <Route path="/cmi-contracts" element={<CMIContractsPage />} />
          <Route path="/brands" element={<BrandManagementPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
        </Routes>
      )}
    </AppLayout>
  );
};

export default Dashboard;