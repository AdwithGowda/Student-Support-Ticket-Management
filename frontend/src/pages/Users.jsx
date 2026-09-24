import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Users = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null); // for ticket history

    // Add Staff form state
    const [form, setForm] = useState({ name:'', email:'', department:'', password:'', role:'STAFF' });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const fetchAll = async () => {
        try {
            const [uRes, tRes] = await Promise.all([
                api.get('/auth/users/'),
                api.get('/tickets/')
            ]);
            setUsers(uRes.data);
            setTickets(tRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const toggleStatus = async (userId, currentStatus) => {
        try {
            await api.patch(`/auth/users/${userId}/`, { is_active: !currentStatus });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setFormError(''); setFormSuccess('');
        if (!form.name || !form.email || !form.password) {
            setFormError('Name, email, and password are required.'); return;
        }
        try {
            await api.post('/auth/register/', { ...form });
            setFormSuccess('User created successfully!');
            setForm({ name:'', email:'', department:'', password:'', role:'STAFF' });
            fetchAll();
            setTimeout(() => { setShowAddModal(false); setFormSuccess(''); }, 1500);
        } catch (err) {
            setFormError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Failed to create user.');
        }
    };

    const getUserTickets = (userId) => tickets.filter(t => t.created_by?.id === userId);
    const getStaffTickets = (userId) => tickets.filter(t => t.assigned_to?.id === userId);

    if (user?.role !== 'ADMIN') return <Navigate to="/" />;

    const filtered = users.filter(u => {
        const matchRole   = roleFilter === 'ALL' || u.role === roleFilter;
        const q = search.toLowerCase();
        const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.student_id?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q);
        return matchRole && matchSearch;
    });

    const roleColor = (r) => ({
        ADMIN: 'bg-purple-100 text-purple-800',
        STAFF: 'bg-blue-100 text-blue-800',
        STUDENT: 'bg-green-100 text-green-800',
    }[r] || 'bg-gray-100 text-gray-800');

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
                    <p className="text-gray-500 mt-1">Manage staff accounts and student access</p>
                </div>
                <button onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm">
                    + Add Staff
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Students', value: users.filter(u=>u.role==='STUDENT').length, color:'text-green-700', bg:'bg-green-50 border-green-100' },
                    { label: 'Staff', value: users.filter(u=>u.role==='STAFF').length, color:'text-blue-700', bg:'bg-blue-50 border-blue-100' },
                    { label: 'Admins', value: users.filter(u=>u.role==='ADMIN').length, color:'text-purple-700', bg:'bg-purple-50 border-purple-100' },
                ].map(s=>(
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 border shadow-sm`}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</div>
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <input type="text" placeholder="Search by name, email, student ID..."
                    className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={search} onChange={e => setSearch(e.target.value)} />
                {['ALL','STUDENT','STAFF','ADMIN'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            roleFilter === r ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>{r === 'ALL' ? 'All Roles' : r}</button>
                ))}
            </div>

            {/* User Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            {['User','Role','Department / ID','Status','Tickets','Actions'].map(h=>(
                                <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Loading users...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">No users match your search.</td></tr>
                        ) : filtered.map(u => {
                            const uTickets = u.role === 'STUDENT' ? getUserTickets(u.id) : getStaffTickets(u.id);
                            const activeTickets = uTickets.filter(t => !['RESOLVED'].includes(t.status)).length;
                            return (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="font-medium text-gray-900 text-sm">{u.name}</div>
                                        <div className="text-xs text-gray-500">{u.email}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColor(u.role)}`}>{u.role}</span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {u.role === 'STUDENT' ? (
                                            <div>
                                                <div>{u.student_id || '—'}</div>
                                                <div className="text-xs text-gray-400">{u.department} · {u.year ? `Year ${u.year}` : ''}</div>
                                            </div>
                                        ) : (
                                            u.department || '—'
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm">
                                        <button onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                                            className="text-blue-600 hover:underline text-xs">
                                            {u.role === 'STUDENT'
                                                ? `${uTickets.length} tickets`
                                                : `${activeTickets} active`}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4">
                                        {u.id !== user?.id && (
                                            <button onClick={() => toggleStatus(u.id, u.is_active)}
                                                className={`text-xs font-medium hover:underline ${u.is_active ? 'text-red-600' : 'text-green-600'}`}>
                                                {u.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Ticket History Panel */}
            {selectedUser && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-gray-800">
                            Ticket History — {selectedUser.name}
                            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${roleColor(selectedUser.role)}`}>{selectedUser.role}</span>
                        </h2>
                        <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                    </div>
                    {(() => {
                        const uTickets = selectedUser.role === 'STUDENT' ? getUserTickets(selectedUser.id) : getStaffTickets(selectedUser.id);
                        const summary = {
                            total: uTickets.length,
                            open: uTickets.filter(t => ['OPEN','ASSIGNED'].includes(t.status)).length,
                            inProgress: uTickets.filter(t => t.status === 'IN_PROGRESS').length,
                            pending: uTickets.filter(t => t.status === 'PENDING').length,
                            resolved: uTickets.filter(t => t.status === 'RESOLVED').length,

                        };
                        return (
                            <>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                                    {[['Total',summary.total,'text-gray-900'],['Open',summary.open,'text-blue-700'],['In Progress',summary.inProgress,'text-yellow-700'],['Pending',summary.pending,'text-orange-700'],['Resolved',summary.resolved,'text-green-700']].map(([l,v,c]) => (
                                        <div key={l} className="bg-gray-50 rounded-lg p-2 text-center">
                                            <div className={`text-xl font-bold ${c}`}>{v}</div>
                                            <div className="text-xs text-gray-500">{l}</div>
                                        </div>
                                    ))}
                                </div>
                                {uTickets.length === 0 ? (
                                    <p className="text-sm text-gray-400">No tickets found for this user.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm divide-y divide-gray-100">
                                            <thead><tr className="text-xs text-gray-500 uppercase">
                                                <th className="py-2 pr-4 text-left">Ticket</th>
                                                <th className="py-2 pr-4 text-left">Title</th>
                                                <th className="py-2 pr-4 text-left">Priority</th>
                                                <th className="py-2 pr-4 text-left">Status</th>
                                                <th className="py-2 pr-4 text-left">Created</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {uTickets.map(t => (
                                                    <tr key={t.id} className="hover:bg-gray-50">
                                                        <td className="py-2 pr-4 font-medium text-blue-600">{t.ticket_number}</td>
                                                        <td className="py-2 pr-4 text-gray-700 max-w-xs truncate">{t.title}</td>
                                                        <td className="py-2 pr-4">
                                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                                t.priority==='URGENT'?'bg-red-100 text-red-800':
                                                                t.priority==='HIGH'?'bg-orange-100 text-orange-800':
                                                                t.priority==='MEDIUM'?'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-800'
                                                            }`}>{t.priority}</span>
                                                        </td>
                                                        <td className="py-2 pr-4">
                                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                                t.status === 'RESOLVED'?'bg-green-100 text-green-800':
                                                                t.status==='PENDING'?'bg-orange-100 text-orange-800':'bg-blue-100 text-blue-800'
                                                            }`}>{t.status.replace('_',' ')}</span>
                                                        </td>
                                                        <td className="py-2 pr-4 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Staff</h3>
                        {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{formError}</div>}
                        {formSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm mb-3">{formSuccess}</div>}
                        <form onSubmit={handleAddStaff} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Full Name *</label>
                                <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Staff Member 01" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email *</label>
                                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="staff@college.edu" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Department</label>
                                <input type="text" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Student Support" />
                            </div>
                            <input type="hidden" value="STAFF" />
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Password *</label>
                                <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Set a strong password" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit"
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm">
                                    Create User
                                </button>
                                <button type="button" onClick={() => { setShowAddModal(false); setFormError(''); setFormSuccess(''); }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
