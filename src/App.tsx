import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import UpdateBanner from './components/UpdateBanner';
import Home from './pages/Home';
import StudentPage from './pages/StudentPage';
import Manage from './pages/Manage';
import ManageStudents from './pages/ManageStudents';
import ManageBehaviors from './pages/ManageBehaviors';
import ManagePresets from './pages/ManagePresets';
import ManageGoals from './pages/ManageGoals';
import ManageLog from './pages/ManageLog';

export default function App() {
  return (
    <>
    <UpdateBanner />
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/student/:id" element={<StudentPage />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/manage/students" element={<ManageStudents />} />
        <Route path="/manage/behaviors" element={<ManageBehaviors />} />
        <Route path="/manage/goals" element={<ManageGoals />} />
        <Route path="/manage/presets" element={<ManagePresets />} />
        <Route path="/manage/log" element={<ManageLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
