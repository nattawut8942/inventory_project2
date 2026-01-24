import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ManualImportPage from './pages/ManualImportPage';
import ReceivePage from './pages/ReceivePage';
import WithdrawPage from './pages/WithdrawPage';
import HistoryPage from './pages/HistoryPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';

// App Routes Component
const AppRoutes = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
            />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="withdraw" element={<WithdrawPage />} />
                <Route path="history" element={<HistoryPage />} />

                {/* Staff Only Routes */}
                <Route
                    path="purchase-orders"
                    element={
                        <ProtectedRoute staffOnly>
                            <PurchaseOrdersPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="receive"
                    element={
                        <ProtectedRoute staffOnly>
                            <ReceivePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="manual-import"
                    element={
                        <ProtectedRoute staffOnly>
                            <ManualImportPage />
                        </ProtectedRoute>
                    }
                />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <DataProvider>
                    <AppRoutes />
                </DataProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
