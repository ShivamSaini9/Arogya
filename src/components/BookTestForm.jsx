import React, { useState } from 'react';

export default function BookTestForm({ centres, token, onBookingSuccess, onRequireAuth }) {
  const [selectedCentre, setSelectedCentre] = useState(centres.length > 0 ? String(centres[0].id) : '');
  const [selectedTest, setSelectedTest] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // When centres load, ensure first centre is selected
  React.useEffect(() => {
    if (!selectedCentre && centres.length > 0) {
      setSelectedCentre(String(centres[0].id));
    }
  }, [centres, selectedCentre]);

  const currentCentre = centres.find(c => String(c.id) === String(selectedCentre));
  const availableTests = currentCentre?.tests || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      onRequireAuth('Please sign in first to book a test');
      return;
    }
    if (!selectedCentre || !selectedTest || !appointmentDate) {
      setError('Please select centre, test, and appointment date');
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          centre_id: parseInt(selectedCentre, 10),
          test_id: parseInt(selectedTest, 10),
          appointment_time: new Date(`${appointmentDate}T10:00:00Z`).toISOString(),
          patient_notes: notes
        })
      });
      const data = await res.json();
      if (res.ok) {
        onBookingSuccess(`Appointment booked successfully! Booking ID #${data.booking.id}`);
        setSelectedTest('');
        setNotes('');
      } else {
        setError(data.error || 'Failed to book appointment');
      }
    } catch {
      setError('Error connecting to server');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs max-w-xl mx-auto">
      <h2 className="text-base font-bold text-gray-900 mb-1">Book a Diagnostic Test</h2>
      <p className="text-xs text-gray-500 mb-4">Choose a diagnostic centre, laboratory test, and appointment date.</p>

      {error && (
        <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Diagnostic Centre */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Diagnostic Centre</label>
          <select
            value={selectedCentre}
            onChange={e => {
              setSelectedCentre(e.target.value);
              setSelectedTest('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white"
            required
          >
            {centres.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.location} ({c.city})
              </option>
            ))}
          </select>
        </div>

        {/* Diagnostic Test */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Diagnostic Test & Price</label>
          <select
            value={selectedTest}
            onChange={e => setSelectedTest(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white"
            required
          >
            <option value="">-- Select Test --</option>
            {availableTests.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} - ₹{parseFloat(t.price).toFixed(0)}
              </option>
            ))}
          </select>
        </div>

        {/* Appointment Date */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Appointment Date</label>
          <input
            type="date"
            value={appointmentDate}
            onChange={e => setAppointmentDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white"
            required
          />
        </div>

        {/* Patient Notes */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Patient Notes (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Morning fasting sample, home visit"
            className="w-full px-3 py-2 border border-gray-300 rounded text-xs"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs shadow-xs"
        >
          Confirm Appointment
        </button>
      </form>
    </div>
  );
}
