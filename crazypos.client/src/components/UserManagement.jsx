import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, AlertCircle, CheckCircle, X, Lock, Shield } from 'lucide-react';
import { getUsers, deactivateUser, reactivateUser, createUser, updateUser, changeUserPassword } from '../utils/auth';
import { getRoles, updateUserRole } from '../utils/roles';

export const UserManagement = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fullName: '',
        password: '',
        confirmPassword: '',
        role: 'Cashier'
    });

    const [editFormData, setEditFormData] = useState({
        userId: '',
        fullName: '',
        email: '',
        role: 'Cashier'
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');

    useEffect(() => {
        loadUsers();
        loadRoles();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            console.log('Loading users...');
            const usersData = await getUsers();
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading users:', error);
            setMessage({ type: 'error', text: 'Failed to load users' });
        } finally {
            setIsLoading(false);
        }
    };

    const loadRoles = async () => {
        try {
            const rolesData = await getRoles();
            setRoles(rolesData);
        } catch (error) {
            console.error('Error loading roles:', error);
            // Gracefully handle error - provide default roles without throwing
            // This allows the screen to work even if the database tables don't exist yet
            setRoles([
                { roleId: 1, roleName: 'Admin', description: 'Administrator', isActive: true },
                { roleId: 2, roleName: 'Manager', description: 'Manager', isActive: true },
                { roleId: 3, roleName: 'Cashier', description: 'Cashier', isActive: true }
            ]);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = !filterRole || user.role === filterRole;
        const matchesStatus = !filterStatus || (filterStatus === 'active' ? user.isActive : !user.isActive);
        
        return matchesSearch && matchesRole && matchesStatus;
    });

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalSuccess('');

        if (!formData.username || !formData.email || !formData.password) {
            setModalError('Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setModalError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await createUser({
                username: formData.username,
                email: formData.email,
                fullName: formData.fullName,
                password: formData.password,
                role: formData.role
            });
            setModalSuccess('User created successfully');
            setTimeout(() => {
                setShowCreateModal(false);
                setFormData({
                    username: '',
                    email: '',
                    fullName: '',
                    password: '',
                    confirmPassword: '',
                    role: 'Cashier'
                });
                setModalError('');
                setModalSuccess('');
                loadUsers();
            }, 1500);
        } catch (error) {
            console.error('Error creating user:', error);
            setModalError(error.message || 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalSuccess('');

        if (!editFormData.fullName || !editFormData.email) {
            setModalError('Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        try {
            await updateUser(editFormData.userId, {
                fullName: editFormData.fullName,
                email: editFormData.email
            });
            setModalSuccess('User updated successfully');
            setTimeout(() => {
                setShowEditModal(false);
                setEditFormData({
                    userId: '',
                    fullName: '',
                    email: '',
                    role: 'Cashier'
                });
                setModalError('');
                setModalSuccess('');
                loadUsers();
            }, 1500);
        } catch (error) {
            console.error('Error updating user:', error);
            setModalError(error.message || 'Failed to update user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalSuccess('');

        if (!passwordData.currentPassword || !passwordData.newPassword) {
            setModalError('Please fill in all password fields');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setModalError('New passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await changeUserPassword(selectedUser.userId, passwordData.currentPassword, passwordData.newPassword);
            setModalSuccess('Password changed successfully');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setModalError('');
                setModalSuccess('');
            }, 1500);
        } catch (error) {
            console.error('Error changing password:', error);
            setModalError(error.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeRole = async (userId, newRole) => {
        setIsLoading(true);
        try {
            await updateUserRole(userId, newRole);
            setMessage({ type: 'success', text: 'User role updated successfully' });
            await loadUsers();
        } catch (error) {
            console.error('Error updating role:', error);
            setMessage({ type: 'error', text: 'Failed to update user role' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (!window.confirm('Are you sure you want to deactivate this user?')) {
            return;
        }

        setIsLoading(true);
        try {
            await deactivateUser(userId);
            setMessage({ type: 'success', text: 'User deactivated successfully' });
            await loadUsers();
        } catch (error) {
            console.error('Error deactivating user:', error);
            setMessage({ type: 'error', text: 'Failed to deactivate user' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReactivateUser = async (userId) => {
        if (!window.confirm('Are you sure you want to reactivate this user?')) {
            return;
        }

        setIsLoading(true);
        try {
            await reactivateUser(userId);
            setMessage({ type: 'success', text: 'User reactivated successfully' });
            await loadUsers();
        } catch (error) {
            console.error('Error reactivating user:', error);
            setMessage({ type: 'error', text: 'Failed to reactivate user' });
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setEditFormData({
            userId: user.userId,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        });
        setShowEditModal(true);
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setShowPasswordModal(true);
    };

    // Check if current user is admin
    const isAdmin = currentUser?.role === 'Admin';

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600">You do not have permission to access the Users Management screen. Only Admins can manage users.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600">Manage system users, roles, and permissions</p>
            </div>

            {/* Message */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                    <div className="flex-1 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Search Users</label>
                        <input
                            type="text"
                            placeholder="Search by name, username, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={() => {
                            setFormData({
                                username: '',
                                email: '',
                                fullName: '',
                                password: '',
                                confirmPassword: '',
                                role: 'Cashier'
                            });
                            setShowCreateModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        New User
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Cashier">Cashier</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Results</label>
                        <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-300 text-sm text-gray-700">
                            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500 text-lg">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Login
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map(user => (
                                    <tr key={user.userId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{user.fullName}</p>
                                                <p className="text-sm text-gray-600">@{user.username}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleChangeRole(user.userId, e.target.value)}
                                                disabled={user.userId === currentUser?.userId}
                                                className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="Admin">Admin</option>
                                                <option value="Manager">Manager</option>
                                                <option value="Cashier">Cashier</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                user.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.lastLogin && user.lastLogin !== '0001-01-01T00:00:00'
                                                ? new Date(user.lastLogin).toLocaleString()
                                                : 'Never'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-sm space-x-2 flex">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                disabled={user.userId === currentUser?.userId}
                                                className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Edit user"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openPasswordModal(user)}
                                                className="text-orange-600 hover:text-orange-800 transition-colors"
                                                title="Change password"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                            {user.isActive ? (
                                                <button
                                                    onClick={() => handleDeactivateUser(user.userId)}
                                                    disabled={user.userId === currentUser?.userId || !user.isActive}
                                                    className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Deactivate user"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReactivateUser(user.userId)}
                                                    className="text-green-600 hover:text-green-800 transition-colors"
                                                    title="Reactivate user"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {modalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{modalError}</p>
                                </div>
                            )}
                            
                            {modalSuccess && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-700">{modalSuccess}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="johndoe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="Cashier">Cashier</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditUser} className="p-6 space-y-4">
                            {modalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{modalError}</p>
                                </div>
                            )}

                            {modalSuccess && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-700">{modalSuccess}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={editFormData.fullName}
                                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={selectedUser.username}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Updating...' : 'Update User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Change Password: {selectedUser.fullName}</h3>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            {modalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{modalError}</p>
                                </div>
                            )}
                            
                            {modalSuccess && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-700">{modalSuccess}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">New Password *</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password *</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
