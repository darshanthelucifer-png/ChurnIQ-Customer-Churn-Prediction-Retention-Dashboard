import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar.jsx';
import Overview from './pages/Overview.jsx';
import CustomerList from './pages/CustomerList.jsx';
import CustomerProfile from './pages/CustomerProfile.jsx';
import PredictSimulate from './pages/PredictSimulate.jsx';
import ModelInsights from './pages/ModelInsights.jsx';

/**
 * Root application component.
 * Sets up React Router with the persistent sidebar layout.
 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/predict" element={<PredictSimulate />} />
            <Route path="/model" element={<ModelInsights />} />
            {/* Settings stub — can be expanded */}
            <Route
              path="/settings"
              element={
                <div className="page-body empty-state">
                  <h2>Settings</h2>
                  <p className="text-muted mt-4">Configuration panel coming soon.</p>
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}