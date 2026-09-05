import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Select from './pages/Select.jsx';
import NewRoom from './pages/NewRoom.jsx';
import RoomBoard from './pages/RoomBoard.jsx';
import RoomHost from './pages/RoomHost.jsx';
import Join from './pages/Join.jsx';
import Team from './pages/Team.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AnonymousRoute from './components/AnonymousRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/select" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/select"
        element={
          <ProtectedRoute>
            <Select />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/new"
        element={
          <ProtectedRoute>
            <NewRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:slug/board"
        element={
          <ProtectedRoute>
            <RoomBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/room/:slug/host"
        element={
          <ProtectedRoute>
            <RoomHost />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join"
        element={
          <AnonymousRoute>
            <Join />
          </AnonymousRoute>
        }
      />
      <Route
        path="/team"
        element={
          <AnonymousRoute>
            <Team />
          </AnonymousRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
