import { useState } from 'react';
import Layout from '../components/Layout';

const Check = () => {
    const [checkForm, setCheckForm] = useState({
        resource: '',
        permission: '',
        subject: '',
        context: ''
    });
    const [expandForm, setExpandForm] = useState({
        resource: '',
        permission: '',
        subjects: '',
        context: ''
    });
    const [lookupSubjectsForm, setLookupSubjectsForm] = useState({
        resource: '',
        permission: '',
        subjectType: '',
        context: ''
    });
    const [lookupResourcesForm, setLookupResourcesForm] = useState({
        subject: '',
        permission: '',
        resourceType: '',
        context: ''
    });
    const [activeTab, setActiveTab] = useState('check');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const performCheck = async () => {
        if (!checkForm.resource || !checkForm.permission || !checkForm.subject) {
            setError('Resource, permission, and subject are required');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const [resourceType, resourceId] = checkForm.resource.split(':');
            const [subjectType, subjectId] = checkForm.subject.split(':');

            if (!resourceType || !resourceId || !subjectType || !subjectId) {
                throw new Error('Invalid format. Use type:id format for resource and subject');
            }

            const requestBody = {
                resource: {
                    object_type: resourceType,
                    object_id: resourceId
                },
                permission: checkForm.permission,
                subject: {
                    object: {
                        object_type: subjectType,
                        object_id: subjectId
                    }
                }
            };

            // Add context if provided
            if (checkForm.context) {
                try {
                    requestBody.context = JSON.parse(checkForm.context);
                } catch (e) {
                    throw new Error('Invalid JSON in context field');
                }
            }

            const response = await fetch('/api/spicedb/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Check request failed');
            }

            const data = await response.json();

            setResult({
                type: 'check',
                permissionship: data.permissionship,
                checked_at: data.checked_at,
                query: `${checkForm.subject} → ${checkForm.resource}#${checkForm.permission}`,
                duration: Date.now() - performance.now() // Approximate
            });

        } catch (err) {
            setError(err.message || 'Failed to perform permission check');
        } finally {
            setIsLoading(false);
        }
    };

    const performExpand = async () => {
        if (!expandForm.resource || !expandForm.permission) {
            setError('Resource and permission are required');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const [resourceType, resourceId] = expandForm.resource.split(':');

            if (!resourceType || !resourceId) {
                throw new Error('Invalid format. Use type:id format for resource');
            }

            const requestBody = {
                resource: {
                    object_type: resourceType,
                    object_id: resourceId
                },
                permission: expandForm.permission
            };

            // Add context if provided
            if (expandForm.context) {
                try {
                    requestBody.context = JSON.parse(expandForm.context);
                } catch (e) {
                    throw new Error('Invalid JSON in context field');
                }
            }

            const response = await fetch('/api/spicedb/expand', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Expand request failed');
            }

            const data = await response.json();

            setResult({
                type: 'expand',
                tree_root: data.treeRoot,
                query: `${expandForm.resource}#${expandForm.permission}`,
            });

        } catch (err) {
            setError(err.message || 'Failed to expand permission');
        } finally {
            setIsLoading(false);
        }
    };

    const performSubjectsLookup = async () => {
        if (!lookupSubjectsForm.resource || !lookupSubjectsForm.permission || !lookupSubjectsForm.subjectType) {
            setError('Resource, permission, and subject type are required');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const [resourceType, resourceId] = lookupSubjectsForm.resource.split(':');

            if (!resourceType || !resourceId) {
                throw new Error('Invalid format. Use type:id format for resource');
            }

            const requestBody = {
                resource: {
                    objectType: resourceType,
                    objectId: resourceId
                },
                permission: lookupSubjectsForm.permission,
                subjectObjectType: lookupSubjectsForm.subjectType
            };

            // Add context if provided
            if (lookupSubjectsForm.context) {
                try {
                    requestBody.context = JSON.parse(lookupSubjectsForm.context);
                } catch (e) {
                    throw new Error('Invalid JSON in context field');
                }
            }

            const response = await fetch('/api/spicedb/lookup-subjects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Lookup request failed');
            }

            const data = await response.json();

            setResult({
                type: 'lookup-subjects',
                subjects: data.subjects || [],
                looked_up_at: data.looked_up_at,
                query: `${lookupSubjectsForm.resource}#${lookupSubjectsForm.permission} ← ${lookupSubjectsForm.subjectType}:*`,
            });

        } catch (err) {
            setError(err.message || 'Failed to lookup subjects');
        } finally {
            setIsLoading(false);
        }
    };

      const performResourcesLookup = async () => {
        if (!lookupResourcesForm.subject || !lookupResourcesForm.permission || !lookupResourcesForm.resourceType) {
            setError('subject, permission, and resource type are required');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const [subjectType, subjectId] = lookupResourcesForm.subject.split(':');

            if (!subjectType || !subjectId) {
                throw new Error('Invalid format. Use type:id format for resource');
            }

            const requestBody = {
                subject: {
                    object: {
                        objectType: subjectType,
                        objectId: subjectId
                    }
                },
                permission: lookupResourcesForm.permission,
                resourceObjectType: lookupResourcesForm.resourceType
            };

            // Add context if provided
            if (lookupResourcesForm.context) {
                try {
                    requestBody.context = JSON.parse(lookupResourcesForm.context);
                } catch (e) {
                    throw new Error('Invalid JSON in context field');
                }
            }

            const response = await fetch('/api/spicedb/lookup-resources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Lookup request failed');
            }

            const data = await response.json();

            setResult({
                type: 'lookup-resources',
                resources: data.resources || [],
                looked_up_at: data.looked_up_at,
                query: `${lookupResourcesForm.resourceType}:*#${lookupResourcesForm.permission} ← ${lookupResourcesForm.subject}`,
            });

        } catch (err) {
            setError(err.message || 'Failed to lookup subjects');
        } finally {
            setIsLoading(false);
        }
    };

    const renderExpandTree = (node, depth = 0) => {
        if (!node) return null;

        const indent = depth * 20;

        return (
            <div key={`${node.expandedObject?.objectType}-${node.expandedObject?.objectId}-${depth}`}
                 style={{marginLeft: `${indent}px`}}
                 className="py-1">

                {/* Render the expanded object (parent node) */}
                <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-600">🏢</span>
                    <span className="font-mono text-sm font-semibold">
                    {node.expandedObject?.objectType}:{node.expandedObject?.objectId}
                        {node.expandedRelation && `#${node.expandedRelation}`}
                </span>
                </div>

                {/* Render the subjects (children) */}
                {node.leaf?.subjects && node.leaf.subjects.map((subject, index) => (
                    <div key={`subject-${index}-${subject.object?.objectId}`}
                         style={{marginLeft: `${indent + 20}px`}}
                         className="py-1">
                        <div className="flex items-center space-x-2">
                            <span className="text-green-600">👤</span>
                            <span className="font-mono text-sm">
                            {subject.object?.objectType}:{subject.object?.objectId}
                                {subject.optionalRelation && `#${subject.optionalRelation}`}
                        </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const getPermissionshipColor = (permissionship) => {
        switch (permissionship) {
            case 'PERMISSIONSHIP_HAS_PERMISSION':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'PERMISSIONSHIP_NO_PERMISSION':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'PERMISSIONSHIP_CONDITIONAL_PERMISSION':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPermissionshipIcon = (permissionship) => {
        switch (permissionship) {
            case 'PERMISSIONSHIP_HAS_PERMISSION': return '✅';
            case 'PERMISSIONSHIP_NO_PERMISSION': return '❌';
            case 'PERMISSIONSHIP_CONDITIONAL_PERMISSION': return '⚠️';
            default: return '❓';
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Authorization Check</h2>
                    <p className="text-gray-600">Perform permission checks, expand permissions, and lookup subjects</p>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('check')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'check'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Permission Check
                        </button>
                        <button
                            onClick={() => setActiveTab('expand')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'expand'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Expand Permission
                        </button>
                        <button
                            onClick={() => setActiveTab('lookup-subjects')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'lookup-subjects'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Lookup Subjects
                        </button>
                        <button
                            onClick={() => setActiveTab('lookup-resources')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'lookup-resources'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Lookup Resources
                        </button>
                    </nav>
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

                {/* Permission Check Tab */}
                {activeTab === 'check' && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Permission Check</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resource (type:id)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., document:readme"
                                        value={checkForm.resource}
                                        onChange={(e) => setCheckForm({...checkForm, resource: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Permission
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., view, edit, delete"
                                        value={checkForm.permission}
                                        onChange={(e) => setCheckForm({...checkForm, permission: e.target.value})}
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
                                        value={checkForm.subject}
                                        onChange={(e) => setCheckForm({...checkForm, subject: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Context (JSON, optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder='e.g., {"ip": "192.168.1.1"}'
                                        value={checkForm.context}
                                        onChange={(e) => setCheckForm({...checkForm, context: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={performCheck}
                                    disabled={isLoading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">✅</span>
                                            Check Permission
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Expand Permission Tab */}
                {activeTab === 'expand' && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Expand Permission</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resource (type:id)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., document:readme"
                                        value={expandForm.resource}
                                        onChange={(e) => setExpandForm({...expandForm, resource: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Permission
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., view, edit, delete"
                                        value={expandForm.permission}
                                        onChange={(e) => setExpandForm({...expandForm, permission: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Context (JSON, optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder='e.g., {"ip": "192.168.1.1"}'
                                        value={expandForm.context}
                                        onChange={(e) => setExpandForm({...expandForm, context: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={performExpand}
                                    disabled={isLoading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Expanding...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">🌳</span>
                                            Expand Permission
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lookup Subjects Tab */}
                {activeTab === 'lookup-subjects' && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Lookup Subjects</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resource (type:id)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., document:readme"
                                        value={lookupSubjectsForm.resource}
                                        onChange={(e) => setLookupSubjectsForm({...lookupSubjectsForm, resource: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Permission
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., view, edit, delete"
                                        value={lookupSubjectsForm.permission}
                                        onChange={(e) => setLookupSubjectsForm({...lookupSubjectsForm, permission: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject Type
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., user, organization"
                                        value={lookupSubjectsForm.subjectType}
                                        onChange={(e) => setLookupSubjectsForm({...lookupSubjectsForm, subjectType: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Context (JSON, optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder='e.g., {"ip": "192.168.1.1"}'
                                        value={lookupSubjectsForm.context}
                                        onChange={(e) => setLookupSubjectsForm({...lookupSubjectsForm, context: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={performSubjectsLookup}
                                    disabled={isLoading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Looking up...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">🔍</span>
                                            Lookup Subjects
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lookup Subjects Tab */}
                {activeTab === 'lookup-resources' && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Lookup Resources</h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject (type:id)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., document:readme"
                                        value={lookupResourcesForm.subject}
                                        onChange={(e) => setLookupResourcesForm({...lookupResourcesForm, subject: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Permission
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., view, edit, delete"
                                        value={lookupResourcesForm.permission}
                                        onChange={(e) => setLookupResourcesForm({...lookupResourcesForm, permission: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resource Type
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., user, organization"
                                        value={lookupResourcesForm.resourceType}
                                        onChange={(e) => setLookupResourcesForm({...lookupResourcesForm, resourceType: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Context (JSON, optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder='e.g., {"ip": "192.168.1.1"}'
                                        value={lookupResourcesForm.context}
                                        onChange={(e) => setLookupResourcesForm({...lookupResourcesForm, context: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <button
                                    onClick={performResourcesLookup}
                                    disabled={isLoading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Looking up...
                                        </>
                                    ) : (
                                        <>
                                            <span className="mr-2">🔍</span>
                                            Lookup Resources
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Result</h3>

                            {result.type === 'check' && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <code className="text-sm bg-gray-100 px-3 py-2 rounded">{result.query}</code>
                                        <span className={`px-3 py-1 rounded text-sm font-medium border ${getPermissionshipColor(result.permissionship)}`}>
                      {getPermissionshipIcon(result.permissionship)} {result.permissionship.replace('PERMISSIONSHIP_', '')}
                    </span>
                                    </div>
                                </div>
                            )}

                            {result.type === 'expand' && (
                                <div>
                                    <div className="mb-4">
                                        <code className="text-sm bg-gray-100 px-3 py-2 rounded">{result.query}</code>
                                    </div>
                                    <div className="border rounded-lg p-4 bg-gray-50">
                                        <h4 className="font-medium mb-2">Permission Tree:</h4>
                                        {result.tree_root ? renderExpandTree(result.tree_root) : <span className="text-gray-500">No tree data</span>}
                                    </div>
                                </div>
                            )}

                            {result.type === 'lookup-subjects' && (
                                <div>
                                    <div className="mb-4">
                                        <code className="text-sm bg-gray-100 px-3 py-2 rounded">{result.query}</code>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Found Subjects ({result.subjects.length}):</h4>
                                        {result.subjects.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {result.subjects.map((subject, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <code className="text-sm">
                                                            {subject.subjectObjectId}
                                                        </code>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPermissionshipColor(subject.permissionship)}`}>
                              {subject.permissionship.replace('PERMISSIONSHIP_', '')}
                            </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No subjects found</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {result.type === 'lookup-resources' && (
                                <div>
                                    <div className="mb-4">
                                        <code className="text-sm bg-gray-100 px-3 py-2 rounded">{result.query}</code>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Found Resources ({result.resources.length}):</h4>
                                        {result.resources.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {result.resources.map((resource, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <code className="text-sm">
                                                            {resource.resourceObjectId}
                                                        </code>
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPermissionshipColor(resource.permissionship)}`}>
                              {resource.permissionship.replace('PERMISSIONSHIP_', '')}
                            </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No resources found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Check;