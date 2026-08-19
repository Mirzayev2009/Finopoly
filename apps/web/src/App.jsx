import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Lobby from './pages/Lobby.jsx';
import GamePlayer from './pages/GamePlayer.jsx';
import GameHost from './pages/GameHost.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <Lobby />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:code"
        element={
          <ProtectedRoute>
            <GamePlayer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:code/host"
        element={
          <ProtectedRoute>
            <GameHost />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
