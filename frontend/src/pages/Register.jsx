import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Business Administration', 'Commerce', 'Arts', 'Other'];
const COURSES = ['B.Tech', 'B.E', 'B.Sc', 'B.Com', 'BBA', 'MBA', 'MCA', 'M.Tech', 'Other'];

const Register = () => {
    const { user, register } = useContext(AuthContext);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '', student_id: '', email: '', phone_number: '',
        department: '', course: '', year: '', password: '', confirm_password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    if (user) return <Navigate to="/" />;

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim())       { setError('Full name is required.'); return; }
        if (!form.student_id.trim()) { setError('Student ID is required.'); return; }
        if (!form.email.trim())      { setError('Email is required.'); return; }
        if (form.password.length < 6){ setError('Password must be at least 6 characters.'); return; }
        if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }

        setLoading(true);
        const result = await register({
            name: form.name, email: form.email, password: form.password,
            student_id: form.student_id, phone_number: form.phone_number,
            department: form.department, course: form.course,
            year: form.year ? parseInt(form.year) : null,
            role: 'STUDENT'
        });
        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } else {
            setError(result.error || 'Registration failed. Please try again.');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                    <p className="text-gray-500 mb-2">Your student account has been created.</p>
                    <p className="text-sm text-gray-400">Redirecting you to login...</p>
                </div>
            </div>
        );
    }

    const Field = ({ label, name, type = 'text', required = false, placeholder = '' }) => (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input type={type} name={name} required={required} placeholder={placeholder}
                value={form[name]} onChange={handleChange}
                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-slate-50 hover:bg-white" />
        </div>
    );

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Left side - Branding (ERP Style) */}
            <div className="hidden lg:flex w-5/12 bg-[#0f172a] text-white flex-col justify-between p-12 relative overflow-hidden sticky top-0 h-screen shrink-0">
                {/* Decorative background circle */}
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/50">S</div>
                        <span className="text-xl font-bold tracking-wide">SupportDesk</span>
                    </div>
                </div>
                
                <div className="relative z-10">
                    <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight tracking-tight">Join the Unified<br/>Campus Network.</h1>
                    <p className="text-slate-400 text-lg max-w-md leading-relaxed">Register your student account to access the support portal, track issues, and manage academic requests seamlessly.</p>
                </div>
                
                <div className="relative z-10 text-slate-500 text-sm font-medium">
                    © 2026 SupportDesk ERP System
                </div>
            </div>

            {/* Right side - Register Form */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white relative">
                <div className="mx-auto w-full max-w-xl">
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-200">S</div>
                        <span className="text-xl font-bold tracking-wide text-slate-900">SupportDesk</span>
                    </div>

                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create your account</h2>
                    <p className="mt-2 text-sm text-slate-500 mb-8">
                        Already have an account? <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">Sign in here</Link>
                    </p>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                            <span className="text-lg">⚠</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal info */}
                        <div className="pb-5 border-b border-gray-100">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Information</div>
                            <div className="space-y-4">
                                <Field label="Full Name" name="name" required placeholder="e.g. John Doe" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Student ID" name="student_id" required placeholder="e.g. STU1001" />
                                    <Field label="Phone Number" name="phone_number" type="tel" placeholder="+91 98765 43210" />
                                </div>
                                <Field label="Email Address" name="email" type="email" required placeholder="john.doe@example.com" />
                            </div>
                        </div>

                        {/* Academic info */}
                        <div className="pb-5 border-b border-gray-100">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Academic Details</div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                                    <select name="department" value={form.department} onChange={handleChange}
                                        className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white transition-all">
                                        <option value="">Select department</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course</label>
                                        <select name="course" value={form.course} onChange={handleChange}
                                            className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white transition-all">
                                            <option value="">Select course</option>
                                            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year</label>
                                        <select name="year" value={form.year} onChange={handleChange}
                                            className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white transition-all">
                                            <option value="">Select year</option>
                                            {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="pb-2">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Set Password</div>
                            <div className="space-y-4">
                                <Field label="Password" name="password" type="password" required placeholder="Min. 6 characters" />
                                <Field label="Confirm Password" name="confirm_password" type="password" required placeholder="Re-enter your password" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-8">
                            {loading ? 'Creating Account...' : 'Create Student Account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
