import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './AppLayout';
import MatrixSignIn from './MatrixSignIn';
import CampaignPerformancePage from '../pages/CampaignPerformancePage';
import AnalyticsPage from '../pages/AnalyticsPage';
import ReportsPage from '../pages/ReportsPage';
import AudiencePage from '../pages/AudiencePage';
import BrandManagementPage from '../pages/BrandManagementPage';
import CMIContractsPage from '../pages/CMIContractsPage';
import ListAnalysisPage from '../pages/ListAnalysisPage';
import SpecialtyPage from '../pages/SpecialtyPage';
import VideoMetricsPage from '../pages/VideoMetricsPage';
import DigitalJournalsPage from '../pages/DigitalJournalsPage';
import JournalAnalysisPage from '../pages/JournalAnalysisPage';
import BasisOptimizationPage from '../pages/BasisOptimizationPage';
import TrackingPage from '../pages/TrackingPage';
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
          <Route path="/dashboard-builder" element={<DashboardCanvas />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audience" element={<AudiencePage />} />
          <Route path="/brands" element={<BrandManagementPage />} />
          <Route path="/cmi-contracts" element={<CMIContractsPage />} />
          <Route path="/list-analysis" element={<ListAnalysisPage />} />
          <Route path="/specialty" element={<SpecialtyPage />} />
          <Route path="/video" element={<VideoMetricsPage />} />
          <Route path="/journals" element={<DigitalJournalsPage />} />
          <Route path="/content-analysis" element={<JournalAnalysisPage />} />
          <Route path="/basis" element={<BasisOptimizationPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
        </Routes>
      )}
    </AppLayout>
  );
};

export default Dashboard;