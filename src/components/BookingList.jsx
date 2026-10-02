import React from 'react';

export default function BookingList({
  bookings,
  token,
  onPay,
  onCancel,
  onOpenAuth,
  onGoToBook
}) {
  if (!token) {
    return (
      <div className="p-8 text-center bg-white rounded border border-gray-200">
        <p className="text-xs text-gray-600 mb-3">Please sign in to view your appointments.</p>
        <button
          onClick={() => onOpenAuth(false)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded shadow-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <h2 className="text-base font-bold text-gray-900">My Appointments</h2>
        <button
          onClick={onGoToBook}
          className="text-xs text-emerald-700 font-medium hover:underline"
        >
          + Book Another Test
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center bg-white rounded border border-gray-200 text-xs text-gray-500">
          No bookings found. Book a test using the first tab.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div
              key={b.id}
              className="bg-white p-4 rounded border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Booking #{b.id}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      b.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : b.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : b.status === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-800 mt-1">{b.test_name}</div>
                <div className="text-gray-500">
                  {b.centre_name} ({b.centre_location})
                </div>
                <div className="text-gray-500 mt-1">
                  Date: {new Date(b.appointment_time).toLocaleDateString()} | Amount: <strong>₹{parseFloat(b.amount).toFixed(0)}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {b.status === 'PENDING' && (
                  <button
                    onClick={() => onPay(b.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                  >
                    Pay ₹{parseFloat(b.amount).toFixed(0)}
                  </button>
                )}

                {b.status !== 'CANCELLED' && (
                  <button
                    onClick={() => onCancel(b.id)}
                    className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
