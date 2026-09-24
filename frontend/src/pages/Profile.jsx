import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const [form, setForm] = useState({ name: '', email: '', phone_number: '' });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        if (user) {
            setForm({ name: user.name || '', email: user.email || '', phone_number: user.phone_number || '' });
        }
    }, [user]);

    // Load ticket stats for student profile
    useEffect(() => {
        if (user?.role === 'STUDENT') {
            api.get('/tickets/').then(r => setTickets(r.data)).catch(console.error);
        }
    }, [user]);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/auth/me/', form);
            setMessage('Profile updated successfully!');
            setIsError(false);
        } catch {
            setMessage('Failed to update profile. Please try again.');
            setIsError(true);
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 4000);
        }
    };

    if (!user) return <div className="flex h-64 items-center justify-center text-gray-500">Loading profile...</div>;

    const roleLabel = { STUDENT: 'Student', STAFF: 'Staff Member', ADMIN: 'Administrator' }[user.role] || user.role;
    const roleColor = { STUDENT: 'bg-green-100 text-green-800', STAFF: 'bg-blue-100 text-blue-800', ADMIN: 'bg-purple-100 text-purple-800' }[user.role];
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const statItems = user.role === 'STUDENT' ? [
        { label: 'Total',      value: tickets.length },
        { label: 'Open',       value: tickets.filter(t => t.status === 'OPEN').length },
        { label: 'In Progress',value: tickets.filter(t => t.status === 'IN_PROGRESS').length },
        { label: 'Pending',    value: tickets.filter(t => t.status === 'PENDING').length },
        { label: 'Resolved',   value: tickets.filter(t => t.status === 'RESOLVED').length },
    ] : null;

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

            {/* ── Identity card ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${roleColor}`}>{roleLabel}</span>
                            {user.is_active
                                ? <span className="text-xs text-green-600 font-medium">🟢 Active</span>
                                : <span className="text-xs text-red-500 font-medium">🔴 Inactive</span>}
                        </div>
                    </div>
                </div>

                {/* Student-specific read-only fields */}
                {user.role === 'STUDENT' && (
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 mb-6">
                        {[
                            ['Student ID',  user.student_id || 'N/A'],
                            ['Department',  user.department || 'N/A'],
                            ['Course',      user.course     || 'N/A'],
                            ['Year',        user.year       ? `Year ${user.year}` : 'N/A'],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
                                <div className="text-sm font-medium text-gray-800 mt-0.5">{value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Staff-specific read-only fields */}
                {user.role === 'STAFF' && user.department && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Department</div>
                        <div className="text-sm font-medium text-gray-800 mt-0.5">{user.department}</div>
                    </div>
                )}

                {/* Editable fields */}
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Edit Information</h3>
                {message && (
                    <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                        <input name="name" type="text" value={form.name} onChange={handleChange} required
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange} required
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone Number</label>
                        <input name="phone_number" type="tel" value={form.phone_number} onChange={handleChange}
                            placeholder="Optional"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors shadow-sm">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* ── Student ticket stats ──────────────────────────────── */}
            {user.role === 'STUDENT' && statItems && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">My Ticket Summary</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {statItems.map(s => (
                            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Account security notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                🔒 <strong>Note:</strong> Student ID, Department, Course, and Year are managed by the system and cannot be changed here. Contact Admin if corrections are needed.
            </div>
        </div>
    );
};

export default Profile;
