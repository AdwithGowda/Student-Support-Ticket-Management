import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const getPriorityColor = (p) => ({
    URGENT: 'bg-red-100 text-red-800 border-red-200',
    HIGH:   'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW:    'bg-green-100 text-green-800 border-green-200',
}[p] || 'bg-gray-100 text-gray-800');

const getStatusColor = (s) => ({
    OPEN:        'bg-blue-100 text-blue-800',
    ASSIGNED:    'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PENDING:     'bg-orange-100 text-orange-800',
    RESOLVED:    'bg-green-100 text-green-800',
    REOPENED:    'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-800');

const StaffDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [sortBy, setSortBy] = useState('UPDATED');

    useEffect(() => {
        api.get('/tickets/')
            .then(r => setTickets(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();

    const isOverdue = (t) => t.due_at && new Date(t.due_at) < now
        && !['RESOLVED'].includes(t.status);

    const getAge = (createdAt) => {
        const diff = Math.abs(now - new Date(createdAt));
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    };

    // Stat cards
    const stats = {
        total:      tickets.length,
        open:       tickets.filter(t => ['OPEN','ASSIGNED'].includes(t.status)).length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        pending:    tickets.filter(t => t.status === 'PENDING').length,
        resolved:   tickets.filter(t => t.status === 'RESOLVED').length,
        overdue:    tickets.filter(t => isOverdue(t)).length,
        urgent:     tickets.filter(t => t.priority === 'URGENT' && !['RESOLVED'].includes(t.status)).length,
    };

    // Filtering
    let filtered = tickets.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
            t.ticket_number.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            t.created_by?.name?.toLowerCase().includes(q);
        const matchStatus   = filterStatus === 'ALL' || t.status === filterStatus;
        const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
        const matchCategory = filterCategory === 'ALL' || t.category === filterCategory;
        return matchSearch && matchStatus && matchPriority && matchCategory;
    });

    // Sorting
    const priorityScore = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    if (sortBy === 'PRIORITY') filtered.sort((a,b) => priorityScore[b.priority] - priorityScore[a.priority]);
    else if (sortBy === 'OLDEST') filtered = [...filtered].reverse();
    else if (sortBy === 'OVERDUE') filtered.sort((a,b) => new Date(a.due_at) - new Date(b.due_at));
    else if (sortBy === 'AGE') filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    // default UPDATED already from API order

    const StatCard = ({ label, value, colorClass = 'text-gray-900', bgClass = 'bg-white border-gray-100' }) => (
        <div className={`${bgClass} rounded-xl p-4 shadow-sm border`}>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        </div>
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading your tickets...</div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
                    <p className="text-gray-500 mt-1">Welcome back, <span className="font-medium text-gray-700">{user?.name}</span></p>
                </div>
                <div className="text-right text-sm text-gray-500">
                    <div>{new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
                </div>
            </div>

            {/* Alert: Overdue */}
            {stats.overdue > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
                    <span className="text-red-500 text-xl">⚠</span>
                    <div>
                        <span className="font-semibold text-red-700">{stats.overdue} ticket{stats.overdue > 1 ? 's' : ''} overdue.</span>
                        <span className="text-red-600 ml-1">Please review and escalate where necessary.</span>
                    </div>
                </div>
            )}
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard label="Total Assigned" value={stats.total} />
                <StatCard label="Open / Assigned" value={stats.open} colorClass="text-blue-700" bgClass="bg-blue-50 border-blue-100" />
                <StatCard label="In Progress" value={stats.inProgress} colorClass="text-yellow-700" bgClass="bg-yellow-50 border-yellow-100" />
                <StatCard label="Resolved" value={stats.resolved} colorClass="text-green-700" bgClass="bg-green-50 border-green-100" />
                <StatCard label="Overdue" value={stats.overdue} colorClass="text-red-700" bgClass="bg-red-50 border-red-100" />
                <StatCard label="Urgent" value={stats.urgent} colorClass="text-red-700" bgClass="bg-red-50 border-red-100" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Search by ticket ID, title, or student name..."
                        className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        <option value="OPEN">Open</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING">Pending</option>
                        <option value="RESOLVED">Resolved</option>

                    </select>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="ALL">All Priorities</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="ALL">All Categories</option>
                        {['Fees','Attendance','ID Card','Certificates','Documents','Technical Support','Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="UPDATED">Recently Updated</option>
                        <option value="OLDEST">Oldest First</option>
                        <option value="PRIORITY">Highest Priority</option>
                        <option value="OVERDUE">Due Soon</option>
                        <option value="AGE">Most Ageing</option>
                    </select>
                </div>
            </div>

            {/* Ticket Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800">My Assigned Tickets</h2>
                    <span className="text-sm text-gray-500">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Ticket', 'Student', 'Category', 'Priority', 'Status', 'Age', 'SLA / Due', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-400">No tickets match your filters.</td></tr>
                            ) : filtered.map(ticket => {
                                const overdue = isOverdue(ticket);
                                return (
                                    <tr key={ticket.id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <Link to={`/tickets/${ticket.id}`} className="font-medium text-blue-600 hover:text-blue-800 text-sm">
                                                {ticket.ticket_number}
                                            </Link>
                                            <div className="text-xs text-gray-500 truncate max-w-40 mt-0.5">{ticket.title}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-800">{ticket.created_by?.name || '—'}</div>
                                            <div className="text-xs text-gray-400">{ticket.created_by?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{ticket.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{getAge(ticket.created_at)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {overdue ? (
                                                <span className="text-red-600 font-semibold text-xs">⚠ OVERDUE</span>
                                            ) : ticket.due_at ? (
                                                <span className="text-gray-600 text-xs">{new Date(ticket.due_at).toLocaleDateString()}</span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                Open →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
