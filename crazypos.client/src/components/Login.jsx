import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { loginUser, registerUser } from '../utils/auth';

export const Login = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [loginForm, setLoginForm] = useState({
        username: '',
        password: ''
    });

    const [registerForm, setRegisterForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'Cashier'
    });

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        
        if (!loginForm.username || !loginForm.password) {
            setMessage({ type: 'error', text: 'Please enter username and password' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await loginUser(loginForm.username, loginForm.password);
            if (response.success) {
                setMessage({ type: 'success', text: 'Login successful!' });
                sessionStorage.setItem('authToken', response.token);
                //localStorage.setItem('authToken', response.token);
                sessionStorage.setItem('user', JSON.stringify(response.user));
                //localStorage.setItem('user', JSON.stringify(response.user));
                setTimeout(() => {
                    onLoginSuccess(response.user, response.token);
                }, 1000);
            } else {
                setMessage({ type: 'error', text: response.message || 'Login failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Login failed' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        
        if (!registerForm.username || !registerForm.email || !registerForm.password) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        if (registerForm.password !== registerForm.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await registerUser({
                username: registerForm.username,
                email: registerForm.email,
                password: registerForm.password,
                fullName: registerForm.fullName,
                role: registerForm.role
            });
            
            if (response.success) {
                setMessage({ type: 'success', text: 'Registration successful! Please login.' });
                setTimeout(() => {
                    setIsLogin(true);
                    setRegisterForm({ username: '', email: '', password: '', confirmPassword: '', fullName: '', role: 'Cashier' });
                    setMessage({ type: '', text: '' });
                }, 2000);
            } else {
                setMessage({ type: 'error', text: response.message || 'Registration failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Registration failed' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-white rounded-lg">
                            <LogIn className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">CrayPOS</h1>
                    <p className="text-blue-100">Professional Point of Sale System</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => { setIsLogin(true); setMessage({ type: '', text: '' }); }}
                            className={`flex-1 py-4 font-medium transition-colors ${
                                isLogin
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setMessage({ type: '', text: '' }); }}
                            className={`flex-1 py-4 font-medium transition-colors ${
                                !isLogin
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form Content */}
                    <div className="p-8">
                        {/* Message */}
                        {message.text && (
                            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
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

                        {/* Login Form */}
                        {isLogin ? (
                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={loginForm.username}
                                        onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="Enter your username"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={loginForm.password}
                                            onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={registerForm.fullName}
                                        onChange={(e) => setRegisterForm({...registerForm, fullName: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={registerForm.username}
                                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="Enter username"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={registerForm.email}
                                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="Enter email address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role
                                    </label>
                                    <select
                                        value={registerForm.role}
                                        onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    >
                                        <option value="Cashier">Cashier</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={registerForm.password}
                                            onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            placeholder="Enter password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={registerForm.confirmPassword}
                                        onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                        placeholder="Confirm password"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    {isLoading ? 'Registering...' : 'Register'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-600">
                        Version 1.0 | Professional POS System
                    </div>
                </div>
            </div>
        </div>
    );
};
