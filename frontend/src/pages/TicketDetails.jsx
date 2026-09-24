import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

/* ── Colour helpers ──────────────────────────────────────────────────────── */
const PRIORITY_CHIP = {
    URGENT: 'bg-red-100 text-red-800 border border-red-200',
    HIGH:   'bg-orange-100 text-orange-800 border border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    LOW:    'bg-green-100 text-green-800 border border-green-200',
};
const STATUS_CHIP = {
    OPEN:        'bg-blue-100 text-blue-800',
    ASSIGNED:    'bg-purple-100 text-purple-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PENDING:     'bg-orange-100 text-orange-800',
    RESOLVED:    'bg-green-100 text-green-800',
    CLOSED:      'bg-gray-200 text-gray-700',
    REOPENED:    'bg-red-100 text-red-800',
};

/* ── Avatar initials ─────────────────────────────────────────────────────── */
const Avatar = ({ name, role }) => {
    const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const bg = role === 'STAFF' ? 'bg-blue-600' : role === 'ADMIN' ? 'bg-purple-600' : 'bg-emerald-600';
    return (
        <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
        </div>
    );
};

/* ── Clean file name ─────────────────────────────────────────────────────── */
const cleanFileName = (path) => {
    const raw = path.split('/').pop() || path;
    // strip Django random suffix (e.g. "_kEkbfm1")
    return raw.replace(/_[A-Za-z0-9]{6,8}(\.\w+)$/, '$1');
};

const fileIcon = (path) => {
    const ext = (path || '').split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼';
    if (ext === 'pdf') return '📄';
    return '📎';
};

/* ── Dedup & filter activity log ─────────────────────────────────────────── */
const cleanActivities = (activities) => {
    const seen = new Set();
    return activities.filter(a => {
        const key = a.description.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        // Hide pure internal noise
        if (key.includes('status changed from pending to pending')) return false;
        if (key.includes('status changed from in_progress to in_progress')) return false;
        return true;
    });
};

/* ── Relative time ───────────────────────────────────────────────────────── */
const relTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/* ── Modal wrapper ───────────────────────────────────────────────────────── */
const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {children}
        </div>
    </div>
);

/* ════════════════════════════════════════════════════════════════════════════ */
const TicketDetails = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [staffList, setStaffList] = useState([]);
    const [flash, setFlash] = useState({ msg: '', err: false });

    // Composer state
    const [comment, setComment] = useState('');
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    // Modal states
    const [modal, setModal] = useState(null); // 'resolve' | 'pending' | 'close' | 'reopen' | 'request_priority' | 'change_priority'
    const [resolutionNote, setResolutionNote] = useState('');
    const [pendingReason, setPendingReason] = useState('');
    const [reopenReason, setReopenReason] = useState('');
    
    // Priority specific states
    const [newPriority, setNewPriority] = useState('');
    const [priorityReason, setPriorityReason] = useState('');

    // Activity view filter
    const [actFilter, setActFilter] = useState('all'); // 'all' | 'comments' | 'status'

    // UI Tabs
    const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' | 'activity'

    const fetchTicket = async () => {
        try {
            const r = await api.get(`/tickets/${id}/`);
            setTicket(r.data);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTicket();
        if (user?.role === 'ADMIN') {
            api.get('/auth/users/').then(r => setStaffList(r.data.filter(u => u.role === 'STAFF'))).catch(() => {});
        }
    }, [id]);

    const notify = (msg, err = false) => {
        setFlash({ msg, err });
        setTimeout(() => setFlash({ msg: '', err: false }), 4000);
    };

    /* ── Actions ──────────────────────────────────────────────────────────── */
    const changeStatus = async (status, reason = '') => {
        try {
            await api.post(`/tickets/${id}/change_status/`, { status, reason });
            notify(`Status updated to ${status.replace('_', ' ')}`);
            fetchTicket();
        } catch (e) {
            notify(e.response?.data?.detail || 'Failed to update status.', true);
        }
    };

    const handlePendingSubmit = async () => {
        if (!pendingReason.trim()) { notify('Enter a reason for the student.', true); return; }
        try {
            await api.post(`/tickets/${id}/change_status/`, { status: 'PENDING', reason: pendingReason });
            await api.post(`/tickets/${id}/comment/`, { message: pendingReason });
            setModal(null); setPendingReason('');
            notify('Ticket marked Pending — student notified.');
            fetchTicket();
        } catch (e) { notify(e.response?.data?.detail || 'Failed.', true); }
    };

    const handleResolveSubmit = async () => {
        if (!resolutionNote.trim()) { notify('Resolution note is required.', true); return; }
        try {
            await api.post(`/tickets/${id}/resolve/`, { resolution_note: resolutionNote });
            setModal(null); setResolutionNote('');
            notify('Ticket resolved successfully!');
            fetchTicket();
        } catch (e) { notify(e.response?.data?.detail || 'Failed.', true); }
    };

    const handleReopenSubmit = async () => {
        try {
            await api.post(`/tickets/${id}/change_status/`, { status: 'REOPENED', reason: reopenReason });
            if (reopenReason.trim()) {
                await api.post(`/tickets/${id}/comment/`, { message: reopenReason });
            }
            setModal(null); setReopenReason('');
            notify('Ticket reopened — staff has been notified.');
            fetchTicket();
        } catch (e) { notify(e.response?.data?.detail || 'Failed.', true); }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const hasMsg = comment.trim();
        const hasFile = !!file;
        if (!hasMsg && !hasFile) return;

        try {
            if (hasMsg) {
                await api.post(`/tickets/${id}/comment/`, { message: comment });
                setComment('');
            }
            if (hasFile) {
                const fd = new FormData();
                fd.append('file', file);
                await api.post(`/tickets/${id}/attach/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
            fetchTicket();
        } catch (e) {
            notify(e.response?.data?.detail || 'Failed to send.', true);
        }
    };

    const handleAssignStaff = async (e) => {
        const val = e.target.value;
        if (!val) return;
        try {
            await api.post(`/tickets/${id}/assign/`, { user_id: val });
            notify('Staff assigned successfully.');
            fetchTicket();
        } catch (e) { notify(e.response?.data?.detail || 'Failed to assign.', true); }
    };

    const handlePriorityChange = (e) => {
        const val = e.target.value;
        if (val !== ticket.priority) {
            setNewPriority(val);
            setModal('change_priority');
        }
    };

    const handlePrioritySubmit = async () => {
        if (!priorityReason.trim()) { notify('Reason is required.', true); return; }
        try {
            await api.post(`/tickets/${id}/change_priority/`, { priority: newPriority, reason: priorityReason });
            setModal(null); setPriorityReason(''); setNewPriority('');
            notify('Priority updated successfully.');
            fetchTicket();
        } catch (e) { notify(e.response?.data?.detail || 'Failed to update priority.', true); }
    };

    const handleRequestPrioritySubmit = async () => {
        if (!priorityReason.trim()) { notify('Reason is required.', true); return; }
        try {
            await api.post(`/tickets/${id}/comment/`, { 
                message: `[PRIORITY CHANGE REQUEST]\nRequested Priority: ${newPriority}\nReason: ${priorityReason}` 
            });
            setModal(null); setPriorityReason(''); setNewPriority('');
            notify('Priority change requested via comment.');
            fetchTicket();
        } catch (e) { notify('Failed to request priority change.', true); }
    };

    /* ── Derived ──────────────────────────────────────────────────────────── */
    const isOverdue = ticket?.due_at && new Date(ticket.due_at) < new Date() && !['RESOLVED','CLOSED'].includes(ticket?.status);
    const isStudent = user?.role === 'STUDENT';
    const isStaff   = user?.role === 'STAFF';
    const isAdmin   = user?.role === 'ADMIN';
    const canModify = isStaff || isAdmin;

    const ageDays = ticket ? Math.floor((Date.now() - new Date(ticket.created_at)) / 86400000) : 0;
    const slaRemaining = ticket?.due_at
        ? Math.ceil((new Date(ticket.due_at) - Date.now()) / 86400000)
        : null;

    const filteredActivities = ticket ? (() => {
        const deduped = cleanActivities([...ticket.activities].reverse()); // newest first
        if (actFilter === 'comments') return deduped.filter(a => a.description.toLowerCase().includes('comment'));
        if (actFilter === 'status') return deduped.filter(a => a.description.toLowerCase().includes('status') || a.description.toLowerCase().includes('assigned') || a.description.toLowerCase().includes('resolved'));
        return deduped;
    })() : [];

    /* ── Progress Bar Logic ────────────────────────────────────────────────── */
    const getStepStatus = (status) => {
        if (['OPEN', 'REOPENED'].includes(status)) return 1;
        if (status === 'ASSIGNED') return 2;
        if (['IN_PROGRESS', 'PENDING'].includes(status)) return 3;
        if (['RESOLVED', 'CLOSED'].includes(status)) return 4;
        return 1;
    };

    const currentStepNum = ticket ? getStepStatus(ticket.status) : 1;
    const steps = [
        { num: 1, label: ticket?.status === 'REOPENED' ? 'Reopened' : 'Submitted' },
        { num: 2, label: 'Assigned' },
        { num: 3, label: ticket?.status === 'PENDING' ? 'Pending Info' : 'In Progress' },
        { num: 4, label: ticket?.status === 'CLOSED' ? 'Closed' : 'Resolved' }
    ];

    /* ── Render ───────────────────────────────────────────────────────────── */
    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
    if (!ticket) return <div className="text-center py-20 text-gray-400">Ticket not found.</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-4">

            {/* ── Flash ─────────────────────────────────────────────────── */}
            {flash.msg && (
                <div className={`rounded-xl px-4 py-3 text-sm border ${flash.err ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {flash.msg}
                </div>
            )}

            {/* ── Breadcrumb ────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <Link to="/" className="hover:text-blue-600">Dashboard</Link>
                <span>/</span>
                <span className="text-gray-600 font-medium">{ticket.ticket_number}</span>
            </div>

            {/* ── Title bar ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-gray-400">{ticket.ticket_number}</span>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_CHIP[ticket.status]}`}>
                                {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${PRIORITY_CHIP[ticket.priority]}`}>
                                {ticket.priority}
                            </span>
                            {isOverdue && (
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white animate-pulse">⚠ OVERDUE</span>
                            )}
                            {ticket.status === 'PENDING' && isStudent && (
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white animate-pulse">Action Required</span>
                            )}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{ticket.title}</h1>
                    </div>

                    {/* Action buttons — role & status aware */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* STAFF / ADMIN buttons */}
                        {canModify && !['CLOSED'].includes(ticket.status) && (
                            <>
                                {(isAdmin
                                    ? ['OPEN','ASSIGNED','PENDING','REOPENED'].includes(ticket.status)
                                    : ['ASSIGNED','REOPENED'].includes(ticket.status)
                                ) && (
                                    <button onClick={() => changeStatus('IN_PROGRESS')}
                                        className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium shadow-sm transition-colors">
                                        ▶ Start Working
                                    </button>
                                )}
                                {(isAdmin
                                    ? !['RESOLVED','CLOSED','PENDING'].includes(ticket.status)
                                    : ticket.status === 'IN_PROGRESS'
                                ) && (
                                    <button onClick={() => setModal('pending')}
                                        className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium shadow-sm transition-colors">
                                        ⏸ Need Info
                                    </button>
                                )}
                                {!['RESOLVED','CLOSED'].includes(ticket.status) && (
                                    <button onClick={() => setModal('resolve')}
                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-colors">
                                        ✓ Resolve
                                    </button>
                                )}
                            </>
                        )}

                        {/* STUDENT buttons on RESOLVED */}
                        {isStudent && ticket.status === 'RESOLVED' && (
                            <>
                                <button onClick={() => setModal('close')}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm">
                                    ✓ Satisfied — Close
                                </button>
                                <button onClick={() => setModal('reopen')}
                                    className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium">
                                    Issue Still Exists
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Progress Bar ──────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-8 py-5">
                <div className="relative flex justify-between items-center w-full max-w-4xl mx-auto">
                    {/* Background track */}
                    <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-100 -translate-y-1/2 z-0" />
                    
                    {/* Active track */}
                    <div className="absolute top-1/2 left-12 h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
                        style={{ width: `calc(${((currentStepNum - 1) / (steps.length - 1)) * 100}% - ${((currentStepNum - 1) / (steps.length - 1)) * 6}rem)` }}
                    />

                    {steps.map((step, idx) => {
                        const isCompleted = step.num < currentStepNum;
                        const isActive = step.num === currentStepNum;
                        
                        let dotColor = 'bg-gray-200 border-white text-gray-400'; // Pending/future step
                        let textColor = 'text-gray-400';
                        let icon = <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />;

                        if (isCompleted) {
                            dotColor = 'bg-blue-500 border-white text-white';
                            textColor = 'text-blue-600 font-semibold';
                            icon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>;
                        } else if (isActive) {
                            textColor = 'text-gray-900 font-bold';
                            // Special colors for active edge cases
                            if (ticket.status === 'PENDING') {
                                dotColor = 'bg-orange-100 border-orange-500 text-orange-600 ring-4 ring-orange-50';
                                icon = <span className="text-xl -mt-1 font-bold">⏸</span>;
                            } else if (ticket.status === 'REOPENED') {
                                dotColor = 'bg-red-100 border-red-500 text-red-600 ring-4 ring-red-50';
                                icon = <span className="text-xl -mt-1 font-bold">↺</span>;
                            } else if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
                                dotColor = 'bg-green-500 border-white text-white ring-4 ring-green-50';
                                icon = <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>;
                                textColor = 'text-green-700 font-bold';
                            } else {
                                dotColor = 'bg-blue-100 border-blue-500 text-blue-600 ring-4 ring-blue-50';
                                icon = <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />;
                            }
                        }

                        return (
                            <div key={step.num} className="relative z-10 flex flex-col items-center group w-24">
                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${dotColor}`}>
                                    {icon}
                                </div>
                                <div className={`mt-2 text-xs text-center transition-colors duration-300 ${textColor}`}>
                                    {step.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── 2-column body ─────────────────────────────────────────── */}
            <div className="flex gap-5 items-start">

                {/* ══ LEFT (65%) — conversation + description ═══════════════ */}
                <div className="flex-1 min-w-0 space-y-4">

                    {/* Pending action prompt for student */}
                    {isStudent && ticket.status === 'PENDING' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <div className="font-semibold text-orange-800 mb-1">⚠ Action Required</div>
                            <p className="text-orange-700 text-sm">Staff has requested additional information. Reply below or upload the required document — this will automatically resume your ticket.</p>
                        </div>
                    )}

                    {/* Resolution note */}
                    {ticket.resolution_note && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                            <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">✓ Resolution</div>
                            <p className="text-green-900 text-sm leading-relaxed">{ticket.resolution_note}</p>
                            {ticket.resolved_at && (
                                <p className="text-xs text-green-500 mt-2">Resolved {new Date(ticket.resolved_at).toLocaleString()}</p>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 border-b border-gray-200 mt-2 mb-4 px-1">
                        <button onClick={() => setActiveTab('discussion')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'discussion' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                            Discussion ({ticket.comments.length})
                        </button>
                        <button onClick={() => setActiveTab('activity')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                            Activity History
                        </button>
                    </div>

                    {/* Tab Content: Discussion */}
                    {activeTab === 'discussion' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-[500px]">
                            {/* Chat bubbles */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                                {ticket.comments.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-10">No messages yet. Start the conversation below.</p>
                                )}
                                {ticket.comments.map(c => {
                                    const isMe = c.user?.id === user?.id;
                                    const role = c.user?.role;
                                    return (
                                        <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <Avatar name={c.user?.name} role={role} />
                                            <div className={`max-w-[85%]`}>
                                                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-semibold text-gray-800">{c.user?.name}</span>
                                                    {role === 'STAFF' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Staff</span>}
                                                    {role === 'ADMIN' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>}
                                                    <span className="text-xs text-gray-400">{relTime(c.created_at)}</span>
                                                </div>
                                                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                                                    ${isMe
                                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                                        : role === 'STAFF' ? 'bg-blue-50 border border-blue-100 text-gray-800 rounded-tl-sm'
                                                        : role === 'ADMIN' ? 'bg-purple-50 border border-purple-100 text-gray-800 rounded-tl-sm'
                                                        : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                                                    }`}>
                                                    {c.message}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Composer */}
                            {ticket.status !== 'CLOSED' && (
                                <form onSubmit={handleCommentSubmit} className="mt-auto pt-4 border-t border-gray-100">
                                    {file && (
                                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3 text-sm w-fit max-w-full">
                                            <span>{fileIcon(file.name)}</span>
                                            <span className="truncate text-blue-700 font-medium">{file.name}</span>
                                            <span className="text-blue-500 text-xs">{(file.size / 1024).toFixed(0)} KB</span>
                                            <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="text-red-400 hover:text-red-600 font-medium ml-2">✕</button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
                                        <label className="cursor-pointer flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" title="Attach file">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                                onChange={e => setFile(e.target.files[0])} />
                                        </label>
                                        <textarea
                                            className="flex-1 bg-transparent py-2.5 text-sm outline-none resize-none min-h-[44px]"
                                            rows="1"
                                            placeholder={isStudent && ticket.status === 'PENDING'
                                                ? 'Provide requested info or upload document...'
                                                : 'Type a message...'}
                                            value={comment}
                                            onChange={e => {
                                                setComment(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = (e.target.scrollHeight < 120 ? e.target.scrollHeight : 120) + 'px';
                                            }}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(e); } }}
                                        />
                                        <button type="submit" disabled={!comment.trim() && !file}
                                            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2 text-right">Press Enter to send, Shift+Enter for new line</div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Tab Content: Activity History */}
                    {activeTab === 'activity' && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-[500px] flex flex-col">
                            <div className="flex gap-2 mb-6">
                                {['all','comments','status'].map(f => (
                                    <button key={f} onClick={() => setActFilter(f)}
                                        className={`px-3 py-1.5 text-xs rounded-lg font-bold uppercase tracking-wider transition-colors ${actFilter === f ? 'bg-blue-100 text-blue-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-5 flex-1 overflow-y-auto pr-2">
                                {filteredActivities.length === 0 && <p className="text-sm text-gray-400 py-10 text-center">No activity matches the filter.</p>}
                                {filteredActivities.map((act, i) => (
                                    <div key={act.id} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-gray-300'}`} />
                                            {i < filteredActivities.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 my-2" />}
                                        </div>
                                        <div className="pb-3 min-w-0">
                                            <div className="text-xs font-bold text-gray-400 mb-1">{new Date(act.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                                            <div className="text-sm text-gray-800 leading-relaxed bg-gray-50 px-4 py-2.5 rounded-xl inline-block border border-gray-100">{act.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ RIGHT sidebar (35%) — metadata ════════════════════════ */}
                <div className="w-80 flex-shrink-0 space-y-4">

                    {/* Unified Ticket Properties Card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-6">
                        
                        {/* Section: Properties */}
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Properties</div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Status</span>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${STATUS_CHIP[ticket.status]}`}>{ticket.status.replace('_',' ')}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium text-gray-500 mt-1.5">Priority</span>
                                    <div className="text-right">
                                        {isAdmin ? (
                                            <select value={ticket.priority} onChange={handlePriorityChange}
                                                className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32 bg-gray-50">
                                                {['LOW','MEDIUM','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        ) : (
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${PRIORITY_CHIP[ticket.priority]}`}>{ticket.priority}</span>
                                                {isStaff && (
                                                    <button onClick={() => setModal('request_priority')} className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors">
                                                        Request Change
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Category</span>
                                    <span className="text-sm font-semibold text-gray-800">{ticket.category}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100"></div>

                        {/* Section: People */}
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">People</div>
                            <div className="space-y-5">
                                {/* Requester */}
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Requester</div>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={ticket.created_by?.name} role="STUDENT" />
                                        <div>
                                            <div className="text-sm font-semibold text-gray-800">{ticket.created_by?.name}</div>
                                            <div className="text-xs font-medium text-gray-500">{ticket.created_by?.student_id || ticket.created_by?.email}</div>
                                        </div>
                                    </div>
                                </div>
                                {/* Assignee */}
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assignee</div>
                                    {isAdmin ? (
                                        <select value={ticket.assigned_to?.id || ''} onChange={handleAssignStaff}
                                            className="w-full text-sm font-medium border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option value="">— Unassigned —</option>
                                            {staffList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    ) : ticket.assigned_to ? (
                                        <div className="flex items-center gap-3">
                                            <Avatar name={ticket.assigned_to?.name} role="STAFF" />
                                            <div>
                                                <div className="text-sm font-semibold text-gray-800">{ticket.assigned_to.name}</div>
                                                <div className="text-xs font-medium text-gray-500">{ticket.assigned_to.department || 'Staff'}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-orange-600 font-semibold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 block text-center">Awaiting assignment</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100"></div>

                        {/* Section: Dates & SLA */}
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Dates & SLA</div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Created</span>
                                    <span className="text-sm font-semibold text-gray-800">{new Date(ticket.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Ageing</span>
                                    <span className={`text-sm font-semibold ${ageDays >= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                                        {ageDays === 0 ? 'Today' : `${ageDays}d`}
                                    </span>
                                </div>
                                <div className={`flex justify-between items-center p-2 rounded-lg ${isOverdue ? 'bg-red-50 border border-red-100' : ''}`}>
                                    <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>SLA Due</span>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                                            {ticket.due_at ? new Date(ticket.due_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}
                                        </div>
                                        {slaRemaining !== null && !['RESOLVED','CLOSED'].includes(ticket.status) && (
                                            <div className={`text-[10px] font-bold uppercase tracking-wider ${slaRemaining < 0 ? 'text-red-600' : slaRemaining <= 1 ? 'text-orange-600' : 'text-green-600'}`}>
                                                {slaRemaining < 0 ? `${Math.abs(slaRemaining)}d overdue` : slaRemaining === 0 ? 'Due today' : `${slaRemaining}d left`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {ticket.resolved_at && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-sm font-medium text-green-700">Resolved</span>
                                        <span className="text-sm font-bold text-green-700">{new Date(ticket.resolved_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attachments card */}
                    {ticket.attachments?.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                Attachments ({ticket.attachments.length})
                            </div>
                            <div className="space-y-2">
                                {ticket.attachments.map(att => {
                                    const name = cleanFileName(att.file);
                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.file);
                                    return (
                                        <a key={att.id}
                                            href={`http://127.0.0.1:8000${att.file}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                                            <span className="text-xl flex-shrink-0">{fileIcon(att.file)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-gray-800 group-hover:text-blue-700 truncate">{name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {att.uploaded_by?.name || 'Unknown'} · {relTime(att.created_at)}
                                                </div>
                                            </div>
                                            <span className="text-blue-400 group-hover:text-blue-600 text-xs flex-shrink-0">↗</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals ────────────────────────────────────────────────── */}

            {modal === 'resolve' && (
                <Modal title="Resolve Ticket" onClose={() => { setModal(null); setResolutionNote(''); }}>
                    <p className="text-sm text-gray-500 mb-3">Explain how the issue was resolved. The student will see this note.</p>
                    <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        rows="4" placeholder="e.g. Fee receipt regenerated and available in the student portal."
                        value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleResolveSubmit} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 text-sm">✓ Mark Resolved</button>
                        <button onClick={() => { setModal(null); setResolutionNote(''); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">Cancel</button>
                    </div>
                </Modal>
            )}

            {modal === 'pending' && (
                <Modal title="Request Information" onClose={() => { setModal(null); setPendingReason(''); }}>
                    <p className="text-sm text-gray-500 mb-3">Describe what you need from the student. This will appear as a message in the conversation.</p>
                    <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        rows="3" placeholder="e.g. Please upload your payment transaction receipt."
                        value={pendingReason} onChange={e => setPendingReason(e.target.value)} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={handlePendingSubmit} className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-medium hover:bg-orange-600 text-sm">⏸ Mark Pending & Notify</button>
                        <button onClick={() => { setModal(null); setPendingReason(''); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">Cancel</button>
                    </div>
                </Modal>
            )}

            {modal === 'close' && (
                <Modal title="Confirm Resolution" onClose={() => setModal(null)}>
                    <div className="text-center py-2">
                        <div className="text-4xl mb-3">🎉</div>
                        <p className="text-gray-600 text-sm mb-5">Are you satisfied with the resolution? Closing the ticket is permanent.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { changeStatus('CLOSED'); setModal(null); }} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 text-sm">Yes, Close Ticket</button>
                        <button onClick={() => setModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">Not Yet</button>
                    </div>
                </Modal>
            )}

            {modal === 'reopen' && (
                <Modal title="Reopen Ticket" onClose={() => { setModal(null); setReopenReason(''); }}>
                    <p className="text-sm text-gray-500 mb-3">Describe why the issue is not resolved. Staff will be notified to continue working.</p>
                    <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        rows="3" placeholder="e.g. The receipt is still showing an incorrect amount."
                        value={reopenReason} onChange={e => setReopenReason(e.target.value)} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleReopenSubmit} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 text-sm">Reopen Ticket</button>
                        <button onClick={() => { setModal(null); setReopenReason(''); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">Cancel</button>
                    </div>
                </Modal>
            )}

            {modal === 'change_priority' && (
                <Modal title="Change Ticket Priority" onClose={() => { setModal(null); setPriorityReason(''); setNewPriority(''); }}>
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                            Change from <strong className="px-2 py-0.5 rounded-full border bg-gray-50">{ticket.priority}</strong> 
                            to <strong className="px-2 py-0.5 rounded-full border bg-gray-50">{newPriority}</strong>
                        </div>
                        <p className="text-sm text-gray-500">Please provide a reason for changing this priority. This will be visible in the activity history.</p>
                    </div>
                    <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows="3" placeholder="e.g. Student has an upcoming fee deadline"
                        value={priorityReason} onChange={e => setPriorityReason(e.target.value)} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={handlePrioritySubmit} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 text-sm">Change Priority</button>
                        <button onClick={() => { setModal(null); setPriorityReason(''); setNewPriority(''); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">Cancel</button>
                    </div>
                </Modal>
            )}

            {modal === 'request_priority' && (
                <Modal title="Request Priority Change" onClose={() => { setModal(null); setPriorityReason(''); setNewPriority(''); }}>
                    <p className="text-sm text-gray-500 mb-3">Request an Admin to change the priority. This will be posted as a comment.</p>
                    
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Requested Priority</label>
                        <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">-- Select Priority --</option>
                            {['LOW','MEDIUM','HIGH','URGENT'].filter(p => p !== ticket.priority).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for request</label>
                        <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            rows="3" placeholder="Explain why the priority should be changed..."
                            value={priorityReason} onChange={e => setPriorityReason(e.target.value)} />
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button onClick={handleRequestPrioritySubmit} disabled={!newPriority} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 text-sm disabled:opacity-50">Submit Request</button>
                        <button onClick={() => { setModal(null); setPriorityReason(''); setNewPriority(''); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 text-sm">Cancel</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TicketDetails;
