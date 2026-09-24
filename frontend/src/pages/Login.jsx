import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    if (user) return <Navigate to="/" />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Left side - Branding (ERP Style) */}
            <div className="hidden lg:flex w-1/2 bg-[#0f172a] text-white flex-col justify-between p-12 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/50">S</div>
                        <span className="text-xl font-bold tracking-wide">SupportDesk</span>
                    </div>
                </div>
                
                <div className="relative z-10">
                    <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight tracking-tight">Streamlined Student<br/>Support Operations.</h1>
                    <p className="text-slate-400 text-lg max-w-md leading-relaxed">The unified ERP solution for managing academic tickets, workflow automation, and student success.</p>
                </div>
                
                <div className="relative z-10 text-slate-500 text-sm font-medium">
                    © 2026 SupportDesk ERP System
                </div>
            </div>

            {/* Right side - Login Form */}
            <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-32 bg-white relative">
                <div className="mx-auto w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-200">S</div>
                        <span className="text-xl font-bold tracking-wide text-slate-900">SupportDesk</span>
                    </div>

                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sign in</h2>
                    <p className="mt-2 text-sm text-slate-500 mb-10">
                        Welcome back! Please enter your details to access your workspace.
                    </p>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                                <span className="text-lg">⚠</span> {error}
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
                            <input
                                type="email" required
                                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-slate-50 hover:bg-white"
                                placeholder="john.doe@example.com"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                            <input
                                type="password" required
                                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-slate-50 hover:bg-white"
                                placeholder="••••••••"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center">
                                <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-slate-700 cursor-pointer">Remember me</label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-semibold text-blue-600 hover:text-blue-700">Forgot password?</a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-6"
                        >
                            Sign in to workspace
                        </button>

                        <div className="mt-8 text-center text-sm font-medium">
                            <span className="text-slate-500">Don't have a student account? </span>
                            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">Register now</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
