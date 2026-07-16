import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Relationships = () => {
    const [resources, setResources] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [filteredRelationships, setFilteredRelationships] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterNamespace, setFilterNamespace] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [newRelationship, setNewRelationship] = useState({
        resource: '',
        relation: '',
        subject: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadResources();
        loadRelationships();
    }, []);

    useEffect(() => {
        filterRelationships();
    }, [relationships, searchTerm, filterNamespace]);

    const totalPages = Math.max(1, Math.ceil(filteredRelationships.length / pageSize));
    const activePage = Math.min(currentPage, totalPages);
    const pageStart = (activePage - 1) * pageSize;
    const paginatedRelationships = filteredRelationships.slice(pageStart, pageStart + pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterNamespace, pageSize]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const loadResources = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/spicedb/resources');

            if (response.ok) {
                const data = await response.json();
                setResources(data.resourceTypes.map((resourceType) => resourceType.name) || []);
            } else {
                const errorData = await response.json();
                setError(`Failed to load resources: ${errorData.message}`);
            }
        } catch (err) {
            setError(`Connection error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRelationships = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/spicedb/relationships');

            if (response.ok) {
                const data = await response.json();
                setRelationships(data.relationships || []);
            } else {
                const errorData = await response.json();
                setError(`Failed to load relationships: ${errorData.message}`);
            }
        } catch (err) {
            setError(`Connection error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const filterRelationships = () => {
        let filtered = relationships;

        if (searchTerm) {
            filtered = filtered.filter(rel =>
                rel.resource.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rel.resource.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rel.relation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rel.subject.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rel.subject.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterNamespace !== 'all') {
            filtered = filtered.filter(rel => rel.resource.type === filterNamespace);
        }

        setFilteredRelationships(filtered);
    };

    const addRelationship = async () => {
        setError('');
        setSuccess('');

        if (!newRelationship.resource || !newRelationship.relation || !newRelationship.subject) {
            setError('All fields are required');
            return;
        }

        setIsLoading(true);
        try {
            // Parse the input format to SpiceDB format
            const [resourceType, resourceId] = newRelationship.resource.split(':');
            const [subjectType, subjectId] = newRelationship.subject.split(':');

            if (!resourceType || !resourceId || !subjectType || !subjectId) {
                throw new Error('Invalid format. Use type:id format for resource and subject');
            }

            const requestBody = {
                resource: {
                    object_type: resourceType,
                    object_id: resourceId
                },
                relation: newRelationship.relation,
                subject: {
                    object: {
                        object_type: subjectType,
                        object_id: subjectId
                    }
                }
            };

            const response = await fetch('/api/spicedb/relationships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                setSuccess('Relationship added successfully');
                setShowAddModal(false);
                setNewRelationship({ resource: '', relation: '', subject: '' });
                loadRelationships(); // Reload the relationships
            } else {
                const errorData = await response.json();
                setError(`Failed to add relationship: ${errorData.message}`);
            }
        } catch (err) {
            setError(`Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteRelationship = async (rel) => {
        if (!confirm('Are you sure you want to delete this relationship?')) return;

        setIsLoading(true);
        try {
            // This would be your actual SpiceDB API call
            await fetch(`/api/spicedb/relationships`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "resourceType": rel.resource.type,
                    "resourceId": rel.resource.id,
                    "subjectType": rel.subject.type,
                    "subjectId": rel.subject.id,
                })
            });
        } catch (err) {
            setError('Failed to delete relationship');
            setIsLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Relationships</h2>
                        <p className="text-gray-600">Manage resource relationships and permissions</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <span className="mr-2">➕</span>
                        Add Relationship
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <span className="text-red-600 mr-2">❌</span>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <span className="text-green-600 mr-2">✅</span>
                            <div>
                                <h3 className="text-sm font-medium text-green-800">Success</h3>
                                <p className="text-sm text-green-700">{success}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search relationships..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <select
                                value={filterNamespace}
                                onChange={(e) => setFilterNamespace(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Resources</option>
                                {resources.map(ns => (
                                    <option key={ns} value={ns}>{ns}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={loadRelationships}
                            disabled={isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Relationships List */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Relationships ({filteredRelationships.length})
                        </h3>

                        {filteredRelationships.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Resource
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Relation
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Subject
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedRelationships.map((rel) => (
                                        <tr key={rel.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-2">
                              {rel.resource.type}
                            </span>
                                                    <span className="text-sm text-gray-900">{rel.resource.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            {rel.relation}
                          </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium mr-2">
                              {rel.subject.type}
                            </span>
                                                    <span className="text-sm text-gray-900">
                              {rel.subject.id}
                                                        {rel.subject.relation && (
                                                            <span className="text-gray-500">#{rel.subject.relation}</span>
                                                        )}
                            </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(rel.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => deleteRelationship(rel)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>

                                <div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <span>
                                            Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredRelationships.length)} of {filteredRelationships.length}
                                        </span>
                                        <label className="flex items-center gap-2">
                                            <span>Rows per page</span>
                                            <select
                                                value={pageSize}
                                                onChange={(event) => setPageSize(Number(event.target.value))}
                                                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
                                            >
                                                {PAGE_SIZE_OPTIONS.map((option) => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                            disabled={activePage === 1}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-2 text-sm text-gray-600">
                                            Page {activePage} of {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                            disabled={activePage === totalPages}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-lg mb-2">🔗</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No relationships found</h3>
                                <p className="text-gray-500">
                                    {searchTerm || filterNamespace !== 'all'
                                        ? 'Try adjusting your search filters'
                                        : 'Add your first relationship to get started'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Relationship Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
                                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                            </div>

                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50">
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                                Add New Relationship
                                            </h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Resource (type:id)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., business:acme-corp"
                                                        value={newRelationship.resource}
                                                        onChange={(e) => setNewRelationship({...newRelationship, resource: e.target.value})}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Relation
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., owner, manager, read_access"
                                                        value={newRelationship.relation}
                                                        onChange={(e) => setNewRelationship({...newRelationship, relation: e.target.value})}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Subject (type:id)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., user:alice"
                                                        value={newRelationship.subject}
                                                        onChange={(e) => setNewRelationship({...newRelationship, subject: e.target.value})}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>

                                                <div className="text-xs text-gray-500">
                                                    <p><strong>Examples based on your schema:</strong></p>
                                                    <p>• Resource: <code>business:acme-corp</code></p>
                                                    <p>• Relation: <code>owner</code> or <code>manager</code> or <code>read_access</code></p>
                                                    <p>• Subject: <code>user:alice</code></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        onClick={addRelationship}
                                        disabled={isLoading}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {isLoading ? 'Adding...' : 'Add Relationship'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Relationships;
