import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChoosePasswordPage from "./pages/ChoosePasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AdminRequestsPage from "./pages/AdminRequestsPage";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/choose-password"
        element={
          <RequireAuth>
            <ChoosePasswordPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminRequestsPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
