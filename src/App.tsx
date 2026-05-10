import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import AccountClosurePage from './pages/AccountClosurePage';
import AdminDashboard from './pages/AdminDashboard';
import CollegePortal from './pages/CollegePortal';
import FriendsPage from './pages/FriendsPage';
import GuarantorsPage from './pages/GuarantorsPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';
import SignUpPage from './pages/SignUpPage';
import StudentDashboard from './pages/StudentDashboard';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute mode="user">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute mode="user">
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/college-portal" element={<CollegePortal />} />
          <Route
            path="/college-portal/dashboard"
            element={
              <ProtectedRoute mode="college">
                <CollegePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute mode="user" roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute mode="user">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute mode="user">
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guarantors"
            element={
              <ProtectedRoute mode="user">
                <GuarantorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transaction-history"
            element={
              <ProtectedRoute mode="user">
                <TransactionHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-closure"
            element={
              <ProtectedRoute mode="user">
                <AccountClosurePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
