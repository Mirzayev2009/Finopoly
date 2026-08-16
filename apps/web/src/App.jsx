import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<Login />} />
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
        path="/game/:gameId"
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
