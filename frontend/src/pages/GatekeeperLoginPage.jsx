import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowRight, Loader2, Lock } from 'lucide-react';

const GatekeeperLoginPage = () => {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!code.trim()) return;

        try {
            setLoading(true);
            const { data } = await api.post('/gatekeepers/login', { code });

            if (data.success) {
                // Store special gatekeeper token
                localStorage.setItem('gatekeeperToken', data.token);
                localStorage.setItem('gatekeeperEvent', data.eventName);
                toast.success(`Logged in as Gatekeeper for ${data.eventName}`);
                navigate('/gatekeeper/scanner');
            }
        } catch (error) {
            console.error('Login failed:', error);
            toast.error(error.response?.data?.message || 'Invalid Access Code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                    <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Gatekeeper Access
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter the access code provided by the event organizer
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                Access Code
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    autoComplete="off"
                                    required
                                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-lg border-gray-300 rounded-lg p-3 tracking-widest font-mono text-center uppercase"
                                    placeholder="XXXXXX"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || code.length < 6}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Verify Code
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GatekeeperLoginPage;
