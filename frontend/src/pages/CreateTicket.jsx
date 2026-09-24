import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const CATEGORIES = ['Fees','Attendance','ID Card','Certificates','Documents','Technical Support','Other'];
const PRIORITIES = [
    { value: 'LOW',    label: 'Low',    desc: 'General enquiry, no deadline impact', color: 'border-green-300 bg-green-50' },
    { value: 'MEDIUM', label: 'Medium', desc: 'Important but not immediately blocking', color: 'border-yellow-300 bg-yellow-50' },
    { value: 'HIGH',   label: 'High',   desc: 'Needs prompt attention within 2 days', color: 'border-orange-300 bg-orange-50' },
    { value: 'URGENT', label: 'Urgent', desc: 'Blocking issue — exam / deadline today', color: 'border-red-300 bg-red-50' },
];

const CreateTicket = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    const [form, setForm] = useState({ title: '', category: 'Fees', priority: 'LOW', description: '' });
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState(null); // ticket object after creation

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) {
            setError('Title and description are required.'); return;
        }
        setLoading(true); setError('');
        try {
            const res = await api.post('/tickets/', form);
            const newTicket = res.data;

            // Upload file if selected
            if (file) {
                const fd = new FormData();
                fd.append('file', file);
                await api.post(`/tickets/${newTicket.id}/attach/`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setCreated(newTicket);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create ticket. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (created) {
        return (
            <div className="max-w-lg mx-auto mt-12 text-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Created!</h2>
                    <p className="text-gray-500 mb-6">Your support request has been submitted successfully.</p>

                    <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket ID</span>
                            <span className="text-xl font-bold text-blue-600">{created.ticket_number}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</span>
                            <span className="text-sm font-medium text-gray-800 text-right max-w-48">{created.title}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</span>
                            <span className="text-sm text-gray-700">{created.category}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                created.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                created.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                created.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>{created.priority}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">OPEN</span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-6">
                        Save your Ticket ID <strong>{created.ticket_number}</strong> to track your request.
                        Staff will be assigned shortly.
                    </p>

                    <div className="flex gap-3">
                        <Link to={`/tickets/${created.id}`}
                            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm">
                            View Ticket
                        </Link>
                        <Link to="/"
                            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm">
                            My Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Create form ───────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Support Ticket</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Tell us what you need help with — be as specific as possible.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
                {error && (
                    <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input type="text" name="title" required
                            value={form.title} onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. Unable to download fee receipt" />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {CATEGORIES.map(cat => (
                                <button key={cat} type="button"
                                    onClick={() => setForm({ ...form, category: cat })}
                                    className={`px-3 py-2 text-sm rounded-xl border font-medium transition-all ${
                                        form.category === cat
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PRIORITIES.map(p => (
                                <button key={p.value} type="button"
                                    onClick={() => setForm({ ...form, priority: p.value })}
                                    className={`px-4 py-3 text-left rounded-xl border-2 transition-all ${
                                        form.priority === p.value
                                            ? `${p.color} border-current`
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}>
                                    <div className="font-semibold text-sm text-gray-800">{p.label}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea name="description" required rows="5"
                            value={form.description} onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                            placeholder="Describe your issue in detail. Include relevant dates, amounts, or reference numbers if applicable." />
                        <div className="text-xs text-gray-400 mt-1 text-right">{form.description.length} characters</div>
                    </div>

                    {/* Attachment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Attachment <span className="text-gray-400 font-normal">(optional)</span></label>
                        <div className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-colors ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            {file ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">📎</span>
                                        <div className="text-left">
                                            <div className="text-sm font-medium text-gray-800">{file.name}</div>
                                            <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setFile(null)}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-3xl">📄</span>
                                    <p className="text-sm text-gray-500 mt-2">Drop a file or click to browse</p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, JPEG, PNG supported</p>
                                </>
                            )}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                                className={`absolute inset-0 opacity-0 cursor-pointer ${file ? 'pointer-events-none' : ''}`}
                                onChange={e => setFile(e.target.files[0])}
                                style={{ position: file ? 'static' : 'absolute' }} />
                            {!file && (
                                <label className="mt-3 inline-block cursor-pointer px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 font-medium">
                                    Browse File
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                                        onChange={e => setFile(e.target.files[0])} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => navigate('/')}
                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-colors shadow-sm">
                            {loading ? 'Submitting...' : 'Submit Ticket →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTicket;
