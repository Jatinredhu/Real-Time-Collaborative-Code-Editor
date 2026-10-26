import { useState } from 'react';
import { api } from '../api.js';

export default function ShareDialog({ docId, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api(`/api/docs/${docId}/share`, {
        method: 'POST',
        body: { email, role },
      });
      setMessage(`Shared with ${email} as ${role}`);
      setEmail('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-bold">Share document</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <input
          type="email"
          placeholder="Their email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="editor">Can edit</option>
          <option value="viewer">Can view</option>
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Share
          </button>
        </div>
      </form>
    </div>
  );
}