import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import BookTestForm from './components/BookTestForm.jsx';
import BookingList from './components/BookingList.jsx';
import AuthModal from './components/AuthModal.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('book');
  const [centres, setCentres] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');

  // Auth modal state
  const [showAuth, setShowAuth] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // Load centres on mount
  useEffect(() => {
    fetch('/api/centres')
      .then(res => res.json())
      .then(data => setCentres(data.centres || []));
  }, []);

  // Sync user profile & bookings on token change
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data && data.user) setUser(data.user);
          else handleLogout();
        });
      loadBookings();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setBookings([]);
    }
  }, [token]);

  const loadBookings = () => {
    if (!token) return;
    fetch('/api/bookings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setBookings(data.bookings || []));
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setMessage('Logged out');
  };

  const handlePay = async (bookingId) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, simulate_status: 'SUCCESS' })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Payment of ₹${data.payment.amount} successful! Status: CONFIRMED`);
        loadBookings();
      } else {
        setMessage(data.error || 'Payment failed');
      }
    } catch {
      setMessage('Payment error');
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Booking #${bookingId} cancelled`);
        loadBookings();
      } else {
        setMessage(data.error || 'Cancel failed');
      }
    } catch {
      setMessage('Error cancelling booking');
    }
  };

  const handleOpenAuth = (signupMode) => {
    setIsSignup(signupMode);
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          if (tab === 'my-bookings') loadBookings();
        }}
        bookingsCount={bookings.length}
      />

      {message && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs py-2 px-4 text-center flex justify-center items-center gap-2">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="underline font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {activeTab === 'book' ? (
          <BookTestForm
            centres={centres}
            token={token}
            onBookingSuccess={msg => {
              setMessage(msg);
              loadBookings();
              setActiveTab('my-bookings');
            }}
            onRequireAuth={msg => {
              setMessage(msg);
              handleOpenAuth(false);
            }}
          />
        ) : (
          <BookingList
            bookings={bookings}
            token={token}
            onPay={handlePay}
            onCancel={handleCancel}
            onOpenAuth={handleOpenAuth}
            onGoToBook={() => setActiveTab('book')}
          />
        )}
      </main>

      <AuthModal
        isOpen={showAuth}
        isSignup={isSignup}
        onClose={() => setShowAuth(false)}
        onAuthSuccess={(newToken, newUser, msg) => {
          setToken(newToken);
          setUser(newUser);
          setMessage(msg);
        }}
        onToggleMode={() => setIsSignup(!isSignup)}
      />

      <footer className="bg-white border-t border-gray-200 py-3 text-center text-xs text-gray-500">
        Sample Helpline: 1800-000-0000 &bull; Sample Support: +91-9999900000 &bull; Arogya Diagnostics
      </footer>
    </div>
  );
}
