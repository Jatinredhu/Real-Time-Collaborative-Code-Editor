import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ShareDialog from '../components/ShareDialog.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    api('/api/docs')
      .then((data) => setDocs(data.docs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function createDoc(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/api/docs', {
        method: 'POST',
        body: { title: title.trim() || undefined },
      });
      navigate(`/doc/${data.doc.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteDoc(id) {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api(`/api/docs/${id}`, { method: 'DELETE' });
      setDocs((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl p-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your documents</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{user.name}</span>
            <button
              onClick={logout}
              className="rounded bg-gray-800 px-3 py-1.5 text-white"
            >
              Log out
            </button>
          </div>
        </header>

        <form onSubmit={createDoc} className="mb-6 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New document title"
            className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Create
          </button>
        </form>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && docs.length === 0 && (
          <p className="text-gray-500">No documents yet. Create one above.</p>
        )}

        <ul className="space-y-2">
          {docs.map((d) => {
            const isOwner = String(d.owner) === user.id;
            return (
              <li
                key={d._id}
                className="flex items-center justify-between rounded-lg bg-white p-4 shadow"
              >
                <Link to={`/doc/${d._id}`} className="flex-1">
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-gray-500">
                    {d.language} · {isOwner ? 'owner' : 'shared with you'} · edited{' '}
                    {new Date(d.updatedAt).toLocaleString()}
                  </p>
                </Link>
                {isOwner && (
                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => setSharing(d._id)}
                      className="text-indigo-600 hover:underline"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => deleteDoc(d._id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {sharing && <ShareDialog docId={sharing} onClose={() => setSharing(null)} />}
      </div>
    </div>
  );
}