import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Spin } from "antd";
import { PrivateRoute, PlatformRoute } from "@/auth/PrivateRoute";
import { AppLayout } from "@/layout/AppLayout";

const Login = lazy(() => import("@/pages/Login"));
const PlatformLogin = lazy(() => import("@/pages/PlatformLogin"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const ChangePassword = lazy(() => import("@/pages/ChangePassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const Loans = lazy(() => import("@/pages/Loans"));
const NewLoan = lazy(() => import("@/pages/NewLoan"));
const LoanDetail = lazy(() => import("@/pages/LoanDetail"));
const Dues = lazy(() => import("@/pages/Dues"));
// Chit groups UI disabled - see routes below.
// const ChitGroups = lazy(() => import("@/pages/ChitGroups"));
// const ChitGroupDetail = lazy(() => import("@/pages/ChitGroupDetail"));
const Calculator = lazy(() => import("@/pages/Calculator"));
const Users = lazy(() => import("@/pages/Users"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const Reports = lazy(() => import("@/pages/Reports"));
const PlatformConsole = lazy(() => import("@/pages/PlatformConsole"));

function PageFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
      <Spin size="large" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/platform/login" element={<PlatformLogin />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/new" element={<NewLoan />} />
            <Route path="/loans/:id" element={<LoanDetail />} />
            <Route path="/dues" element={<Dues />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route element={<PrivateRoute allow={["ADM"]} />}>
              {/* Chit groups UI disabled
              <Route path="/chit-groups" element={<ChitGroups />} />
              <Route path="/chit-groups/:id" element={<ChitGroupDetail />} />
              */}
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
          </Route>
        </Route>

        <Route element={<PlatformRoute />}>
          <Route path="/platform" element={<PlatformConsole />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
