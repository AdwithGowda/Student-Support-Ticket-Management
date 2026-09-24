import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortBy, setSortBy] = useState('NEWEST');

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const response = await api.get('/tickets/');
                setTickets(response.data);
            } catch (err) {
                console.error('Error fetching tickets', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, []);

    const getStatusColor = (status) => {
        const colors = {
            'OPEN': 'bg-blue-100 text-blue-800',
            'ASSIGNED': 'bg-purple-100 text-purple-800',
            'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
            'PENDING': 'bg-orange-100 text-orange-800',
            'RESOLVED': 'bg-green-100 text-green-800',
            'REOPENED': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    if (loading) return <div>Loading tickets...</div>;

    let filteredTickets = tickets.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.ticket_number.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (sortBy === 'OLDEST') {
        filteredTickets.reverse();
    } else if (sortBy === 'PRIORITY') {
        const priorityScore = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        filteredTickets.sort((a, b) => priorityScore[b.priority] - priorityScore[a.priority]);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {user?.role === 'STUDENT' ? `Welcome, ${user.name}` : 'Dashboard'}
                    </h1>
                    {user?.role === 'STUDENT' && (
                        <p className="text-gray-600 mt-1">Here is the status of your support requests.</p>
                    )}
                </div>
                {user?.role === 'STUDENT' && (
                    <Link to="/create-ticket" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm font-medium">
                        + Create New Ticket
                    </Link>
                )}
            </div>
            
            {/* DASHBOARD CARDS BY ROLE */}
            {user?.role === 'STUDENT' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">My Tickets</div>
                        <div className="text-2xl font-bold">{tickets.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Open</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'OPEN').length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">In Progress</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'IN_PROGRESS').length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Pending</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'PENDING').length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Resolved</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'RESOLVED').length}</div>
                    </div>
                </div>
            )}

            {user?.role === 'STAFF' && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">My Open Tickets</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED').length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">In Progress</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'IN_PROGRESS').length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Pending</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'PENDING').length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <div className="text-sm text-gray-500">Resolved</div>
                        <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'RESOLVED').length}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
                        <div className="text-sm text-red-700">Overdue</div>
                        <div className="text-2xl font-bold text-red-700">
                            {tickets.filter(t => new Date(t.due_at) < new Date() && !['RESOLVED'].includes(t.status)).length}
                        </div>
                    </div>
                </div>
            )}

            {user?.role === 'ADMIN' && (
                <div className="space-y-4 mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="text-sm text-gray-500">Total Tickets</div>
                            <div className="text-2xl font-bold">{tickets.length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="text-sm text-gray-500">Open</div>
                            <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'OPEN').length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="text-sm text-gray-500">Assigned</div>
                            <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'ASSIGNED').length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="text-sm text-gray-500">In Progress</div>
                            <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'IN_PROGRESS').length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="text-sm text-gray-500">Pending</div>
                            <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'PENDING').length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                            <div className="text-sm text-gray-500">Resolved</div>
                            <div className="text-2xl font-bold">{tickets.filter(t => t.status === 'RESOLVED').length}</div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
                            <div className="text-sm text-red-700">Overdue</div>
                            <div className="text-2xl font-bold text-red-700">
                                {tickets.filter(t => new Date(t.due_at) < new Date() && !['RESOLVED'].includes(t.status)).length}
                            </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-100">
                            <div className="text-sm text-orange-700">Urgent</div>
                            <div className="text-2xl font-bold text-orange-700">
                                {tickets.filter(t => t.priority === 'URGENT').length}
                            </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-100">
                            <div className="text-sm text-purple-700">Escalated</div>
                            <div className="text-2xl font-bold text-purple-700">
                                {tickets.filter(t => new Date(t.due_at) < new Date() && !['RESOLVED'].includes(t.status) && t.priority === 'URGENT').length}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex space-x-4 mb-4">
                <input
                    type="text"
                    placeholder="Search tickets..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESOLVED">Resolved</option>

                </select>
                <select
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="NEWEST">Newest First</option>
                    <option value="OLDEST">Oldest First</option>
                    <option value="PRIORITY">Highest Priority</option>
                </select>
            </div>

            <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTickets.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-900 font-medium">
                                        {ticket.ticket_number}
                                    </Link>
                                    <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.title}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {ticket.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${ticket.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 
                                          ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 
                                          ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-green-100 text-green-800'}`}>
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTickets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No tickets found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
