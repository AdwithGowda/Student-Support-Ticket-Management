import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';

const Bar = ({ value, max, color = 'bg-blue-500' }) => (
    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex-1">
        <div className={`h-full ${color} rounded-full transition-all duration-500`}
            style={{ width: max ? `${(value / max) * 100}%` : '0%' }} />
    </div>
);

const Reports = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/tickets/')
            .then(r => setTickets(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (user?.role !== 'ADMIN') return <Navigate to="/" />;
    if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading reports...</div>;

    const now = new Date();

    // ── Derivations ──────────────────────────────────────────────────────────
    const byStatus = ['OPEN','ASSIGNED','IN_PROGRESS','PENDING','RESOLVED','REOPENED']
        .map(s => ({ label: s.replace('_',' '), value: tickets.filter(t => t.status === s).length, status: s }));

    const byPriority = ['URGENT','HIGH','MEDIUM','LOW']
        .map(p => ({ label: p, value: tickets.filter(t => t.priority === p).length, priority: p }));

    const CATEGORIES = ['Fees','Attendance','ID Card','Certificates','Documents','Technical Support','Other'];
    const byCategory = CATEGORIES.map(c => ({
        label: c,
        value: tickets.filter(t => t.category === c).length
    }));

    const resolved = tickets.filter(t => t.status === 'RESOLVED');
    const resolvedWithTime = resolved.filter(t => t.resolved_at);
    const avgResolutionDays = resolvedWithTime.length
        ? (resolvedWithTime.reduce((sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)) / 86400000, 0) / resolvedWithTime.length).toFixed(1)
        : 'N/A';

    const overdue = tickets.filter(t => t.due_at && new Date(t.due_at) < now && !['RESOLVED'].includes(t.status));
    const reopened = tickets.filter(t => t.status === 'REOPENED');
    const pending = tickets.filter(t => t.status === 'PENDING');

    // Ageing for unresolved
    const active = tickets.filter(t => !['RESOLVED'].includes(t.status));
    const ageBuckets = [
        { label: '0–2 days', tickets: active.filter(t => (now - new Date(t.created_at)) / 86400000 <= 2) },
        { label: '3–5 days', tickets: active.filter(t => { const d=(now-new Date(t.created_at))/86400000; return d>2&&d<=5; }) },
        { label: '6–10 days', tickets: active.filter(t => { const d=(now-new Date(t.created_at))/86400000; return d>5&&d<=10; }) },
        { label: '10+ days', tickets: active.filter(t => (now-new Date(t.created_at))/86400000>10), warn: true },
    ];

    // CSV Export
    const exportCSV = () => {
        const rows = [
            ['Ticket ID','Title','Student','Category','Priority','Status','Assigned To','Created Date','Resolved Date','Resolution Days','SLA Due'],
            ...tickets.map(t => {
                const resDays = t.resolved_at
                    ? ((new Date(t.resolved_at)-new Date(t.created_at))/86400000).toFixed(1)
                    : '';
                return [
                    t.ticket_number, `"${t.title}"`, t.created_by?.name||'',
                    t.category, t.priority, t.status, t.assigned_to?.name||'Unassigned',
                    new Date(t.created_at).toLocaleDateString(),
                    t.resolved_at ? new Date(t.resolved_at).toLocaleDateString() : '',
                    resDays,
                    t.due_at ? new Date(t.due_at).toLocaleDateString() : ''
                ];
            })
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'tickets_report.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const statusColors = {
        OPEN:'bg-blue-400', ASSIGNED:'bg-purple-400', IN_PROGRESS:'bg-yellow-400',
        PENDING:'bg-orange-400', RESOLVED:'bg-green-400', REOPENED:'bg-red-400'
    };
    const priorityColors = { URGENT:'bg-red-500', HIGH:'bg-orange-400', MEDIUM:'bg-yellow-400', LOW:'bg-green-400' };

    const maxStatus = Math.max(...byStatus.map(b => b.value), 1);
    const maxPriority = Math.max(...byPriority.map(b => b.value), 1);
    const maxCategory = Math.max(...byCategory.map(b => b.value), 1);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-gray-500 mt-1">System-wide performance summary</p>
                </div>
                <button onClick={exportCSV}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm flex items-center gap-2">
                    ↓ Export CSV
                </button>
            </div>

            {/* ── Resolution Summary ──────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Resolved', value: resolved.length, color: 'text-green-700', bg: 'bg-green-50 border-green-100' },
                    { label: 'Avg Resolution', value: avgResolutionDays === 'N/A' ? 'N/A' : `${avgResolutionDays}d`, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                    { label: 'Overdue', value: overdue.length, color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
                    { label: 'Reopened', value: reopened.length, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 border shadow-sm`}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</div>
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* ── Charts row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* By Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">Tickets by Status</h3>
                    <div className="space-y-3">
                        {byStatus.filter(b=>b.value>0).map(b => (
                            <div key={b.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700 font-medium">{b.label}</span>
                                    <span className="font-bold text-gray-900">{b.value}</span>
                                </div>
                                <Bar value={b.value} max={maxStatus} color={statusColors[b.status]} />
                            </div>
                        ))}
                        {byStatus.every(b => b.value === 0) && <p className="text-sm text-gray-400">No tickets yet.</p>}
                    </div>
                </div>

                {/* By Priority */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">Tickets by Priority</h3>
                    <div className="space-y-3">
                        {byPriority.map(b => (
                            <div key={b.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700 font-medium">{b.label}</span>
                                    <span className="font-bold text-gray-900">{b.value}</span>
                                </div>
                                <Bar value={b.value} max={maxPriority} color={priorityColors[b.priority]} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Category */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">Tickets by Category</h3>
                    <div className="space-y-3">
                        {byCategory.filter(b=>b.value>0).map(b => (
                            <div key={b.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700 font-medium">{b.label}</span>
                                    <span className="font-bold text-gray-900">{b.value}</span>
                                </div>
                                <Bar value={b.value} max={maxCategory} color="bg-indigo-400" />
                            </div>
                        ))}
                        {byCategory.every(b=>b.value===0) && <p className="text-sm text-gray-400">No tickets yet.</p>}
                    </div>
                </div>
            </div>

            {/* ── Ageing + Pending ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ageing */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">Ticket Ageing (Active / Unresolved)</h3>
                    <div className="space-y-3">
                        {ageBuckets.map(b => (
                            <div key={b.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className={`font-medium ${b.warn && b.tickets.length > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                        {b.label} {b.warn && b.tickets.length > 0 && '⚠'}
                                    </span>
                                    <span className={`font-bold ${b.warn && b.tickets.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{b.tickets.length}</span>
                                </div>
                                <Bar value={b.tickets.length} max={Math.max(active.length,1)} color={b.warn ? 'bg-red-400' : 'bg-blue-400'} />
                                {b.warn && b.tickets.length > 0 && (
                                    <div className="mt-1 text-xs text-red-600">
                                        {b.tickets.map(t => t.ticket_number).join(', ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Tickets */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">Pending Tickets ({pending.length})</h3>
                    {pending.length === 0 ? (
                        <p className="text-sm text-gray-400">No pending tickets. 🎉</p>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {pending.map(t => {
                                const lastComment = t.comments?.[t.comments.length - 1];
                                return (
                                    <div key={t.id} className="border border-orange-100 bg-orange-50 rounded-xl p-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-orange-800 text-sm">{t.ticket_number}</span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full border ${
                                                t.priority === 'URGENT' ? 'bg-red-100 text-red-800 border-red-200' :
                                                t.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-yellow-100 text-yellow-800'
                                            }`}>{t.priority}</span>
                                        </div>
                                        <div className="text-xs text-orange-700 mt-1">{t.title}</div>
                                        <div className="text-xs text-gray-500 mt-1">Student: {t.created_by?.name} · Assigned: {t.assigned_to?.name || 'Unassigned'}</div>
                                        {lastComment && (
                                            <div className="text-xs text-gray-400 mt-1 truncate">"{lastComment.message}"</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Audit Log: Recent Activity ─────────────────────────── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Recent System Activity (Audit Log)</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {tickets.length === 0 ? <p className="text-sm text-gray-400">No activity yet.</p> :
                    tickets.flatMap(t =>
                        (t.activities || []).map(a => ({
                            ...a,
                            ticket_number: t.ticket_number,
                            ticket_id: t.id,
                        }))
                    )
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 15)
                    .map(a => (
                        <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="text-xs text-gray-400 whitespace-nowrap pt-0.5 w-32 flex-shrink-0">
                                {new Date(a.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                            </div>
                            <div className="text-xs font-medium text-blue-600 w-20 flex-shrink-0">{a.ticket_number}</div>
                            <div className="text-xs text-gray-700">{a.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Reports;
