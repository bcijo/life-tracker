import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import AppLoader from './common/AppLoader';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <AppLoader variant="fullscreen" message="Securing your space..." />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
