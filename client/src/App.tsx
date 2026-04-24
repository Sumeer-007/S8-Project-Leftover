// src/App.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/app/AppShell";

import DonorHome from "@/screens/donor/DonorHome";
import DonorCreate from "@/screens/donor/DonorCreate";
import DonorDonations from "@/screens/donor/DonorDonations";

import VolunteerHome from "@/screens/volunteer/VolunteerHome";
import VolunteerPickups from "@/screens/volunteer/VolunteerPickups";
import VolunteerTasks from "@/screens/volunteer/VolunteerTasks";
import TaskChecklist from "@/screens/volunteer/TaskChecklist";

import DonationDetails from "@/screens/shared/DonationDetails";
import Alerts from "@/screens/shared/Alerts";
import Profile from "@/screens/shared/Profile";
import Settings from "@/screens/shared/Settings";

import Login from "@/screens/auth/Login";
import Signup from "@/screens/auth/Signup";
import PendingApproval from "@/screens/auth/PendingApproval";
import FeedbackPage from "@/screens/feedback/FeedbackPage";

import {
  getCurrentUserSync,
  getHomePathFor,
  isLoggedInSync,
} from "@/lib/authClient";
import { NotificationListener } from "./components/notification-listener/NotificationListener";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedInSync()) return <Navigate to="/auth/login" replace />;
  return children;
}

function IndexRedirect() {
  if (!isLoggedInSync()) return <Navigate to="/auth/login" replace />;
  const user = getCurrentUserSync();
  if (!user) return <Navigate to="/auth/login" replace />;
  return <Navigate to={getHomePathFor(user)} replace />;
}

export default function App() {
  return (
    <>
      <NotificationListener />
      <Routes>
        {/* Root */}
        <Route path="/" element={<IndexRedirect />} />

        {/* Auth only */}
        <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/pending" element={<PendingApproval />} />

        {/* Public feedback page (link sent to end users by email) */}
        <Route path="/feedback/:token" element={<FeedbackPage />} />

        {/* Protected app */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* Donor */}
          <Route path="/donor/home" element={<DonorHome />} />
          <Route path="/donor/create" element={<DonorCreate />} />
          <Route path="/donor/donations" element={<DonorDonations />} />

          {/* Volunteer */}
          <Route path="/volunteer/home" element={<VolunteerHome />} />
          <Route path="/volunteer/pickups" element={<VolunteerPickups />} />
          <Route path="/volunteer/tasks" element={<VolunteerTasks />} />
          <Route
            path="/volunteer/tasks/:taskId/checklist"
            element={<TaskChecklist />}
          />

          {/* Shared */}
          <Route path="/donations/:id" element={<DonationDetails />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
