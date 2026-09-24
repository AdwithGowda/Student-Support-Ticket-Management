import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateTicket from './pages/CreateTicket';
import TicketDetails from './pages/TicketDetails';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Users from './pages/Users';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading workspace...</div>;
    return user ? children : <Navigate to="/login" />;
};

const Layout = ({ children }) => (
    <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
                {/* Max-w wrapper ensures content doesn't stretch infinitely on huge monitors */}
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    </div>
);

// Each role gets their own landing dashboard
const HomeRoute = () => {
    const { user } = useContext(AuthContext);
    if (user?.role === 'ADMIN') return <AdminDashboard />;
    if (user?.role === 'STAFF') return <StaffDashboard />;
    return <StudentDashboard />;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route path="/" element={
                        <PrivateRoute><Layout><HomeRoute /></Layout></PrivateRoute>
                    } />
                    <Route path="/create-ticket" element={
                        <PrivateRoute><Layout><CreateTicket /></Layout></PrivateRoute>
                    } />
                    <Route path="/tickets/:id" element={
                        <PrivateRoute><Layout><TicketDetails /></Layout></PrivateRoute>
                    } />
                    <Route path="/reports" element={
                        <PrivateRoute><Layout><Reports /></Layout></PrivateRoute>
                    } />
                    <Route path="/users" element={
                        <PrivateRoute><Layout><Users /></Layout></PrivateRoute>
                    } />
                    <Route path="/profile" element={
                        <PrivateRoute><Layout><Profile /></Layout></PrivateRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
