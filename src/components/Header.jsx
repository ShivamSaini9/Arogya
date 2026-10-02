import React from 'react';

export default function Header({ user, onLogout, onOpenAuth, activeTab, setActiveTab, bookingsCount }) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Arogya Diagnostics</h1>
          <p className="text-xs text-gray-500">Diagnostic Test Booking & Appointments</p>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3 text-xs">
              <span>Welcome, <strong>{user.name}</strong></span>
              <button
                onClick={onLogout}
                className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth(false)}
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth(true)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 flex gap-6 text-sm border-t border-gray-100">
        <button
          onClick={() => setActiveTab('book')}
          className={`py-2.5 font-medium border-b-2 ${
            activeTab === 'book' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600'
          }`}
        >
          Book a Test
        </button>
        <button
          onClick={() => setActiveTab('my-bookings')}
          className={`py-2.5 font-medium border-b-2 ${
            activeTab === 'my-bookings' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600'
          }`}
        >
          My Bookings {bookingsCount > 0 && `(${bookingsCount})`}
        </button>
      </div>
    </header>
  );
}
