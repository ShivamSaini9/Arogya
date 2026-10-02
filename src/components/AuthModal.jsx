import React, { useState } from 'react';

export default function AuthModal({ isOpen, isSignup, onClose, onAuthSuccess, onToggleMode }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.token, data.user, isSignup ? 'Registered successfully!' : 'Login successful!');
        onClose();
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xs w-full p-5 border border-gray-200 shadow-lg text-xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <span className="font-bold text-gray-900">{isSignup ? 'Register' : 'Sign In'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-base">
            &times;
          </button>
        </div>

        {error && (
          <div className="p-2 bg-red-50 text-red-700 rounded text-[11px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignup && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          )}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded"
              placeholder="e.g. user@example.com"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="text-center text-gray-500 pt-1">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-emerald-700 underline text-[11px]"
          >
            {isSignup ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
