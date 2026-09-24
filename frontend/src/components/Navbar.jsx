import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm shrink-0">
            {/* Left side: Spacer */}
            <div className="flex items-center flex-1">
            </div>

            {/* Right side: Actions & User */}
            <div className="flex items-center gap-5">


                {/* Sign Out Button */}
                <button 
                    onClick={handleLogout}
                    className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                    <span>Sign Out</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
            </div>
        </header>
    );
};

export default Navbar;
