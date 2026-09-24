import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
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
    CLOSED:      'bg-gray-200 text-gray-700',
    REOPENED:    'bg-red-100 text-red-800',
}[s] || 'bg-gray-100 text-gray-800');

const StatCard = ({ label, value, sub, colorClass = 'text-gray-900', bgClass = 'bg-white border-gray-100', onClick }) => (
    <div onClick={onClick} className={`${bgClass} rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow`}>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</div>
        <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
);

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStaff, setFilterStaff] = useState('ALL');
    const [filterDate, setFilterDate] = useState('ALL');
    const [sortBy, setSortBy] = useState('NEWEST');
    const [activeAgeBucket, setActiveAgeBucket] = useState(null);

    const fetchAll = async () => {
        try {
            const [tRes, uRes] = await Promise.all([
                api.get('/tickets/'),
                api.get('/auth/users/')
            ]);
            setTickets(tRes.data);
            setStaffList(uRes.data.filter(u => u.role === 'STAFF'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    if (user?.role !== 'ADMIN') return <Navigate to="/" />;

    const now = new Date();
    const isOverdue = (t) => t.due_at && new Date(t.due_at) < now && !['RESOLVED','CLOSED'].includes(t.status);
    const getAgeDays = (t) => Math.floor((now - new Date(t.created_at)) / 86400000);

    // ── Stats ────────────────────────────────────────────────────────────────
    const active = tickets.filter(t => !['RESOLVED','CLOSED'].includes(t.status));
    const overdue = tickets.filter(t => isOverdue(t));
    const urgent = tickets.filter(t => t.priority === 'URGENT' && !['RESOLVED','CLOSED'].includes(t.status));
    const escalated = tickets.filter(t => isOverdue(t) && t.priority === 'URGENT');
    const withinSla = active.filter(t => t.due_at && new Date(t.due_at) >= now);
    const dueSoon = withinSla.filter(t => {
        const hrs = (new Date(t.due_at) - now) / 3600000;
        return hrs <= 24;
    });

    // ── Ageing buckets ───────────────────────────────────────────────────────
    const ageBuckets = {
        '0–2 days': active.filter(t => getAgeDays(t) <= 2),
        '3–5 days': active.filter(t => getAgeDays(t) >= 3 && getAgeDays(t) <= 5),
        '6–10 days': active.filter(t => getAgeDays(t) >= 6 && getAgeDays(t) <= 10),
        '10+ days': active.filter(t => getAgeDays(t) > 10),
    };

    // ── Staff workload ───────────────────────────────────────────────────────
    const staffWorkload = staffList.map(s => ({
        ...s,
        open:       tickets.filter(t => t.assigned_to?.id === s.id && ['OPEN','ASSIGNED'].includes(t.status)).length,
        inProgress: tickets.filter(t => t.assigned_to?.id === s.id && t.status === 'IN_PROGRESS').length,
        pending:    tickets.filter(t => t.assigned_to?.id === s.id && t.status === 'PENDING').length,
        resolved:   tickets.filter(t => t.assigned_to?.id === s.id && t.status === 'RESOLVED').length,
        total:      tickets.filter(t => t.assigned_to?.id === s.id && !['RESOLVED','CLOSED'].includes(t.status)).length,
    }));

    // ── Filtered ticket list ─────────────────────────────────────────────────
    let filtered = tickets.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
            t.ticket_number.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            t.created_by?.name?.toLowerCase().includes(q) ||
            t.created_by?.student_id?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.assigned_to?.name?.toLowerCase().includes(q);

        const matchStatus   = filterStatus === 'ALL'   || t.status === filterStatus;
        const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
        const matchCategory = filterCategory === 'ALL' || t.category === filterCategory;
        const matchStaff    = filterStaff === 'ALL'    || String(t.assigned_to?.id) === filterStaff ||
                             (filterStaff === 'UNASSIGNED' && !t.assigned_to);

        let matchDate = true;
        if (filterDate !== 'ALL') {
            const created = new Date(t.created_at);
            const daysAgo = (now - created) / 86400000;
            if (filterDate === 'TODAY') matchDate = daysAgo < 1;
            else if (filterDate === '7') matchDate = daysAgo <= 7;
            else if (filterDate === '30') matchDate = daysAgo <= 30;
        }

        let matchAge = true;
        if (activeAgeBucket) matchAge = ageBuckets[activeAgeBucket]?.some(bt => bt.id === t.id);

        return matchSearch && matchStatus && matchPriority && matchCategory && matchStaff && matchDate && matchAge;
    });

    const priorityScore = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    if (sortBy === 'PRIORITY') filtered.sort((a,b) => priorityScore[b.priority] - priorityScore[a.priority]);
    else if (sortBy === 'OLDEST') filtered = [...filtered].reverse();
    else if (sortBy === 'AGE') filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'DUE') filtered.sort((a,b) => new Date(a.due_at||0) - new Date(b.due_at||0));

    // ── CSV Export ───────────────────────────────────────────────────────────
    const exportCSV = () => {
        const rows = [
            ['Ticket ID','Title','Student','Category','Priority','Status','Assigned To','Created','Resolved','SLA Due'],
            ...filtered.map(t => [
                t.ticket_number, `"${t.title}"`, t.created_by?.name || '', t.category,
                t.priority, t.status, t.assigned_to?.name || 'Unassigned',
                new Date(t.created_at).toLocaleDateString(),
                t.resolved_at ? new Date(t.resolved_at).toLocaleDateString() : '',
                t.due_at ? new Date(t.due_at).toLocaleDateString() : '',
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'tickets_report.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading admin dashboard...</div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Full system overview · {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm">
                        ↓ Export CSV
                    </button>
                </div>
            </div>

            {/* ── Escalation Alert ──────────────────────────────────────── */}
            {escalated.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🚨</span>
                    <div>
                        <div className="font-bold text-red-800">{escalated.length} ticket{escalated.length > 1 ? 's' : ''} ESCALATED — Urgent & Overdue</div>
                        <div className="text-red-700 text-sm mt-1">These tickets are urgent priority AND past their SLA. Immediate action required.</div>
                        <button onClick={() => { setFilterStatus('ALL'); setFilterPriority('URGENT'); setActiveAgeBucket(null); }}
                            className="mt-2 text-xs text-red-700 underline hover:text-red-900">View escalated tickets →</button>
                    </div>
                </div>
            )}

            {/* ── Stat cards row 1: Status ──────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard label="Total" value={tickets.length} />
                <StatCard label="Open" value={tickets.filter(t=>t.status==='OPEN').length}
                    colorClass="text-blue-700" bgClass="bg-blue-50 border-blue-100"
                    onClick={() => setFilterStatus('OPEN')} />
                <StatCard label="Assigned" value={tickets.filter(t=>t.status==='ASSIGNED').length}
                    colorClass="text-purple-700" bgClass="bg-purple-50 border-purple-100"
                    onClick={() => setFilterStatus('ASSIGNED')} />
                <StatCard label="In Progress" value={tickets.filter(t=>t.status==='IN_PROGRESS').length}
                    colorClass="text-yellow-700" bgClass="bg-yellow-50 border-yellow-100"
                    onClick={() => setFilterStatus('IN_PROGRESS')} />
                <StatCard label="Resolved" value={tickets.filter(t=>t.status==='RESOLVED').length}
                    colorClass="text-green-700" bgClass="bg-green-50 border-green-100"
                    onClick={() => setFilterStatus('RESOLVED')} />
            </div>

            {/* ── Stat cards row 2: Alerts ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard label="⚠ Overdue" value={overdue.length}
                    sub="Past SLA deadline"
                    colorClass="text-red-700" bgClass="bg-red-50 border-red-200"
                    onClick={() => { setFilterStatus('ALL'); setActiveAgeBucket(null); setSearch(''); }} />
                <StatCard label="🔥 Urgent (Active)" value={urgent.length}
                    sub="Requires 1-day resolution"
                    colorClass="text-orange-700" bgClass="bg-orange-50 border-orange-200"
                    onClick={() => setFilterPriority('URGENT')} />
                <StatCard label="🚨 Escalated" value={escalated.length}
                    sub="Urgent + Overdue"
                    colorClass="text-red-800" bgClass="bg-red-100 border-red-300"
                    onClick={() => { setFilterPriority('URGENT'); setActiveAgeBucket(null); }} />
            </div>

            {/* ── SLA Monitor + Ageing ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SLA Monitor */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h2 className="font-semibold text-gray-800 mb-3">SLA Monitor</h2>
                    <div className="space-y-3">
                        {[
                            { label: '✅ Within SLA', value: withinSla.length - dueSoon.length, color: 'text-green-700', bar: 'bg-green-400' },
                            { label: '⏰ Due in 24h', value: dueSoon.length, color: 'text-yellow-700', bar: 'bg-yellow-400' },
                            { label: '❌ Overdue', value: overdue.length, color: 'text-red-700', bar: 'bg-red-500' },
                        ].map(row => (
                            <div key={row.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className={`font-medium ${row.color}`}>{row.label}</span>
                                    <span className="font-bold text-gray-800">{row.value}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${row.bar} rounded-full transition-all`}
                                        style={{ width: active.length ? `${(row.value / Math.max(active.length,1)) * 100}%` : '0%' }} />
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                            <div className="flex justify-between"><span>Low (5 days)</span><span>Medium (3 days)</span><span>High (2 days)</span><span>Urgent (1 day)</span></div>
                        </div>
                    </div>
                </div>

                {/* Ageing */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h2 className="font-semibold text-gray-800 mb-3">Ticket Ageing (Unresolved)</h2>
                    <div className="space-y-3">
                        {Object.entries(ageBuckets).map(([label, bTickets]) => (
                            <div key={label} onClick={() => setActiveAgeBucket(activeAgeBucket === label ? null : label)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
                                    ${activeAgeBucket === label ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 rounded-full bg-blue-400" style={{ width: `${Math.max((bTickets.length / Math.max(active.length, 1)) * 80, 4)}px` }} />
                                    <span className={`text-sm font-medium ${label === '10+ days' ? 'text-red-700' : 'text-gray-700'}`}>{label}</span>
                                </div>
                                <span className={`text-lg font-bold ${label === '10+ days' && bTickets.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                    {bTickets.length}
                                    {label === '10+ days' && bTickets.length > 0 && ' ⚠'}
                                </span>
                            </div>
                        ))}
                        {activeAgeBucket && (
                            <button onClick={() => setActiveAgeBucket(null)} className="text-xs text-blue-600 hover:underline">
                                Clear age filter ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Staff Workload ────────────────────────────────────────── */}
            {staffWorkload.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h2 className="font-semibold text-gray-800 mb-4">Staff Workload</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {staffWorkload.map(s => (
                            <div key={s.id} onClick={() => setFilterStaff(filterStaff === String(s.id) ? 'ALL' : String(s.id))}
                                className={`border rounded-xl p-4 cursor-pointer transition-all
                                    ${filterStaff === String(s.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-semibold text-gray-800 text-sm">{s.name}</div>
                                        <div className="text-xs text-gray-500">{s.department || 'Staff'} · {s.is_active ? '🟢 Active' : '🔴 Inactive'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-blue-700">{s.total}</div>
                                        <div className="text-xs text-gray-400">active</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                                    {[['Open', s.open, 'text-blue-600'],['In Prog', s.inProgress,'text-yellow-600'],['Pending',s.pending,'text-orange-600'],['Resolved',s.resolved,'text-green-600']].map(([l,v,c]) => (
                                        <div key={l} className="bg-gray-50 rounded-lg py-1">
                                            <div className={`font-bold ${c}`}>{v}</div>
                                            <div className="text-gray-400">{l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {staffWorkload.length === 0 && (
                            <div className="col-span-3 text-center text-gray-400 py-4">No staff found. Add staff from Manage Users.</div>
                        )}
                    </div>
                </div>
            )}

            {/* ── All Tickets Table ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800 mb-3">All Tickets</h2>
                    <div className="flex flex-wrap gap-2">
                        <input type="text" placeholder="Search ticket ID, title, student, staff..."
                            className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search} onChange={e => setSearch(e.target.value)} />
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="ALL">All Statuses</option>
                            {['OPEN','ASSIGNED','IN_PROGRESS','PENDING','RESOLVED','CLOSED','REOPENED'].map(s=>(
                                <option key={s} value={s}>{s.replace('_',' ')}</option>
                            ))}
                        </select>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                            <option value="ALL">All Priorities</option>
                            {['URGENT','HIGH','MEDIUM','LOW'].map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                            <option value="ALL">All Categories</option>
                            {['Fees','Attendance','ID Card','Certificates','Documents','Technical Support','Other'].map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
                            <option value="ALL">All Staff</option>
                            <option value="UNASSIGNED">Unassigned</option>
                            {staffList.map(s=><option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </select>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filterDate} onChange={e => setFilterDate(e.target.value)}>
                            <option value="ALL">All Dates</option>
                            <option value="TODAY">Today</option>
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                        </select>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                            <option value="NEWEST">Newest First</option>
                            <option value="OLDEST">Oldest First</option>
                            <option value="PRIORITY">Highest Priority</option>
                            <option value="AGE">Most Ageing</option>
                            <option value="DUE">Due Soon</option>
                        </select>
                        {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterCategory !== 'ALL' || filterStaff !== 'ALL' || filterDate !== 'ALL' || search || activeAgeBucket) && (
                            <button onClick={() => { setFilterStatus('ALL'); setFilterPriority('ALL'); setFilterCategory('ALL'); setFilterStaff('ALL'); setFilterDate('ALL'); setSearch(''); setActiveAgeBucket(null); }}
                                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                                Clear Filters ×
                            </button>
                        )}
                    </div>
                    {activeAgeBucket && (
                        <div className="mt-2 text-xs text-blue-700">📌 Filtering by age: <strong>{activeAgeBucket}</strong></div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Ticket','Student','Category','Priority','Status','Assigned To','Age','SLA / Due','Action'].map(h=>(
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-400">No tickets match your filters.</td></tr>
                            ) : filtered.map(t => {
                                const ov = isOverdue(t);
                                const ageDays = getAgeDays(t);
                                return (
                                    <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${ov ? 'bg-red-50/50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <Link to={`/tickets/${t.id}`} className="font-medium text-blue-600 hover:text-blue-800 text-sm">{t.ticket_number}</Link>
                                            <div className="text-xs text-gray-400 truncate max-w-32 mt-0.5">{t.title}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-800">{t.created_by?.name || '—'}</div>
                                            <div className="text-xs text-gray-400">{t.created_by?.student_id || t.created_by?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{t.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(t.status)}`}>{t.status.replace('_',' ')}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{t.assigned_to?.name || <span className="text-orange-600 text-xs font-medium">Unassigned</span>}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={ageDays >= 7 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                                {ageDays}d {ageDays >= 7 && '⚠'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {ov ? <span className="text-red-600 font-bold">⚠ OVERDUE</span>
                                                : t.due_at ? new Date(t.due_at).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link to={`/tickets/${t.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Open →</Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                    Showing {filtered.length} of {tickets.length} tickets
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
