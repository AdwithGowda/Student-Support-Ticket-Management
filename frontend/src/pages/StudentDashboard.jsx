import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const STATUS_COLOR = {
    OPEN:        'bg-blue-100 text-blue-800',
    ASSIGNED:    'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PENDING:     'bg-orange-100 text-orange-800',
    RESOLVED:    'bg-green-100 text-green-800',
    REOPENED:    'bg-red-100 text-red-800',
};

const PRIORITY_COLOR = {
    URGENT: 'bg-red-100 text-red-800 border border-red-200',
    HIGH:   'bg-orange-100 text-orange-800 border border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    LOW:    'bg-green-100 text-green-800 border border-green-200',
};

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');

    useEffect(() => {
        api.get('/tickets/')
            .then(r => setTickets(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const pending = tickets.filter(t => t.status === 'PENDING');

    const stats = [
        { label: 'My Tickets',  value: tickets.length,                                                      color: 'text-gray-900',   bg: 'bg-white border-gray-100' },
        { label: 'Open',        value: tickets.filter(t => t.status === 'OPEN').length,                     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100' },
        { label: 'In Progress', value: tickets.filter(t => t.status === 'IN_PROGRESS').length,              color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
        { label: 'Resolved',    value: tickets.filter(t => t.status === 'RESOLVED').length,                 color: 'text-green-700',  bg: 'bg-green-50 border-green-100' },
    ];

    const filtered = tickets.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !search || t.ticket_number.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        const matchStatus   = filterStatus === 'ALL'   || t.status === filterStatus;
        const matchCategory = filterCategory === 'ALL' || t.category === filterCategory;
        const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
        return matchSearch && matchStatus && matchCategory && matchPriority;
    });

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading your tickets...</div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name} 👋</h1>
                    <p className="text-gray-500 mt-1">Here is the status of your support requests.</p>
                </div>
                <Link to="/create-ticket"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm">
                    + Create New Ticket
                </Link>
            </div>

            {/* ── Pending alert ──────────────────────────────────────── */}
            {pending.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-orange-500 text-xl mt-0.5">⚠</span>
                    <div>
                        <div className="font-semibold text-orange-800">
                            {pending.length} ticket{pending.length > 1 ? 's' : ''} need your attention
                        </div>
                        <div className="text-orange-700 text-sm mt-1">
                            Staff has requested additional information. Please open the ticket and reply.
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {pending.map(t => (
                                <Link key={t.id} to={`/tickets/${t.id}`}
                                    className="text-xs font-medium text-orange-700 underline hover:text-orange-900">
                                    {t.ticket_number}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stat cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label}
                        onClick={() => setFilterStatus(s.label === 'My Tickets' ? 'ALL' : s.label.toUpperCase().replace(' ', '_'))}
                        className={`${s.bg} rounded-xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition-shadow`}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</div>
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* ── Filters ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap gap-3">
                    <input type="text" placeholder="Search by ticket ID, title, or category..."
                        className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        {['OPEN','ASSIGNED','IN_PROGRESS','PENDING','RESOLVED','REOPENED'].map(s => (
                            <option key={s} value={s}>{s.replace('_',' ')}</option>
                        ))}
                    </select>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="ALL">All Categories</option>
                        {['Fees','Attendance','ID Card','Certificates','Documents','Technical Support','Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="ALL">All Priorities</option>
                        {['URGENT','HIGH','MEDIUM','LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {(filterStatus !== 'ALL' || filterCategory !== 'ALL' || filterPriority !== 'ALL' || search) && (
                        <button onClick={() => { setFilterStatus('ALL'); setFilterCategory('ALL'); setFilterPriority('ALL'); setSearch(''); }}
                            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                            Clear ×
                        </button>
                    )}
                </div>
            </div>

            {/* ── Ticket list ─────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800">My Tickets</h2>
                    <span className="text-sm text-gray-500">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">🎫</div>
                        <div className="text-gray-500 font-medium mb-1">No tickets found</div>
                        <div className="text-gray-400 text-sm mb-4">
                            {tickets.length === 0
                                ? "You haven't raised any support requests yet."
                                : "Try adjusting your filters."}
                        </div>
                        {tickets.length === 0 && (
                            <Link to="/create-ticket" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium">
                                + Create Your First Ticket
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filtered.map(ticket => {
                            const isPending = ticket.status === 'PENDING';
                            return (
                                <Link key={ticket.id} to={`/tickets/${ticket.id}`}
                                    className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group
                                        ${isPending ? 'bg-orange-50/40' : ''}`}>
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                                isPending ? 'bg-orange-500 animate-pulse' :
                                                ticket.status === 'OPEN' ? 'bg-blue-500' :
                                                ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                                                ticket.status === 'RESOLVED' ? 'bg-green-500' : 'bg-gray-400'
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-blue-600 text-sm group-hover:text-blue-800">{ticket.ticket_number}</span>
                                                {isPending && (
                                                    <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full animate-pulse">
                                                        ⚠ Action Needed
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-gray-800 font-medium text-sm truncate mt-0.5">{ticket.title}</div>
                                            <div className="text-gray-400 text-xs mt-0.5">
                                                {ticket.category} · Created {new Date(ticket.created_at).toLocaleDateString()}
                                                {ticket.assigned_to ? ` · Assigned to ${ticket.assigned_to.name}` : ' · Awaiting assignment'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${PRIORITY_COLOR[ticket.priority]}`}>
                                            {ticket.priority}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[ticket.status]}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-gray-400 group-hover:text-gray-600 text-xs">→</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
