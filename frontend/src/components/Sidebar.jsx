import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FiPieChart, FiPlusCircle, FiUser, FiBriefcase, FiActivity, FiBarChart2, FiUsers, FiSettings } from 'react-icons/fi';

const Sidebar = () => {
    const location = useLocation();
    const { user } = useContext(AuthContext);

    const navItems = [];

    if (user?.role === 'STUDENT') {
        navItems.push({ path: '/',              label: 'Dashboard', icon: <FiPieChart /> });
        navItems.push({ path: '/create-ticket', label: 'Create Ticket', icon: <FiPlusCircle /> });
        navItems.push({ path: '/profile',       label: 'My Profile', icon: <FiUser /> });
    } else if (user?.role === 'STAFF') {
        navItems.push({ path: '/',              label: 'Workspace', icon: <FiBriefcase /> });
        navItems.push({ path: '/profile',       label: 'My Profile', icon: <FiUser /> });
    } else if (user?.role === 'ADMIN') {
        navItems.push({ path: '/',              label: 'Overview', icon: <FiActivity /> });
        navItems.push({ path: '/reports',       label: 'Analytics', icon: <FiBarChart2 /> });
        navItems.push({ path: '/users',         label: 'Directory', icon: <FiUsers /> });
        navItems.push({ path: '/profile',       label: 'Settings', icon: <FiSettings /> });
    }

    const roleLabel = user?.role === 'STUDENT' ? 'STUDENT PORTAL'
                    : user?.role === 'STAFF'   ? 'STAFF WORKSPACE'
                    : 'ADMIN CONSOLE';

    return (
        <aside className="w-[72px] hover:w-64 group bg-white text-gray-600 flex flex-col h-full border-r border-gray-200 z-20 shrink-0 transition-all duration-300 overflow-hidden">
            {/* Brand Header */}
            <div className="h-16 flex items-center px-5 border-b border-gray-100 bg-white whitespace-nowrap">
                <div className="w-8 h-8 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-600/30">
                    S
                </div>
                <span className="text-gray-900 font-extrabold tracking-wide text-lg ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">SupportDesk</span>
            </div>

            {/* User Identity Card */}
            <div className="px-4 py-6 border-b border-gray-100 bg-gray-50/50 whitespace-nowrap">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{roleLabel}</div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold shadow-sm flex-shrink-0">
                        {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-sm font-bold text-gray-900 truncate">{user?.name}</div>
                        {user?.department ? (
                            <div className="text-xs text-gray-500 truncate mt-0.5">{user.department}</div>
                        ) : user?.student_id ? (
                            <div className="text-xs text-gray-500 truncate mt-0.5">{user.student_id}</div>
                        ) : (
                            <div className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto whitespace-nowrap overflow-x-hidden custom-scrollbar">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Menu</div>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={item.label}
                            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <span className="shrink-0 text-lg opacity-90">{item.icon}</span>
                            <span className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 whitespace-nowrap overflow-hidden">
                <div className="text-xs text-gray-400 text-center font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">SupportDesk ERP v1.0</div>
            </div>
        </aside>
    );
};

export default Sidebar;
