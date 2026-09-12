import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Applicability from "./pages/Applicability";
import Radar from "./pages/Radar";
import Verify from "./pages/Verify";
import Complaints from "./pages/Complaints";
import Dashboard from "./pages/Dashboard";
import Offices from "./pages/Offices";
import Contact from "./pages/Contact";
import Marks from "./pages/Marks";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applicability"
          element={
            <ProtectedRoute>
              <Applicability />
            </ProtectedRoute>
          }
        />
        <Route path="/radar" element={<Radar />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/marks" element={<Marks />} />
        <Route path="/offices" element={<Offices />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/complaints"
          element={
            <ProtectedRoute>
              <Complaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Landing />} />
      </Route>
    </Routes>
  );
}
