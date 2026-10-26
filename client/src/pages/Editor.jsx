import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import { useAuth } from '../context/AuthContext.jsx';
import { SocketProvider } from '../collab/provider.js';
import { EditorState, Compartment } from '@codemirror/state';
import { LANGUAGES, languageFor } from '../collab/languages.js';

const COLORS = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4b5563'];
const STATUS_DOT = {
  synced: 'bg-green-500',
  connecting: 'bg-yellow-500',
  offline: 'bg-red-500',
};

function colorFor(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export default function Editor() {
  const { id } = useParams();
  const { user } = useAuth();
  const containerRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [myId, setMyId] = useState(null);
  const providerRef = useRef(null);
  const [language, setLanguage] = useState('javascript');

    useEffect(() => {
    let view = null;
    const languageConf = new Compartment();

    function applyLanguage(name) {
      setLanguage(name);
      view?.dispatch({
        effects: languageConf.reconfigure(languageFor(name).extension()),
      });
    }

    const provider = new SocketProvider(id, localStorage.getItem('token'), {
      onStatus: setStatus,
      onError: setError,
      onLanguage: applyLanguage,
      onSynced: ({ role, language }) => {
        setError('');
        setRole(role);
        applyLanguage(language);
        if (view) return;

        const ytext = provider.ydoc.getText('code');
        const undoManager = new Y.UndoManager(ytext);
        const readOnly = role === 'viewer';

        view = new EditorView({
          parent: containerRef.current,
          state: EditorState.create({
            doc: ytext.toString(),
            extensions: [
              keymap.of([...yUndoManagerKeymap]),
              basicSetup,
              languageConf.of(languageFor(language).extension()),
              yCollab(ytext, provider.awareness, { undoManager }),
              EditorState.readOnly.of(readOnly),
              EditorView.editable.of(!readOnly),
            ],
          }),
        });
      },
    });
    providerRef.current = provider;

    const color = colorFor(user.id);
    provider.awareness.setLocalStateField('user', {
      name: user.name,
      color,
      colorLight: `${color}33`,
    });
    setMyId(provider.ydoc.clientID);

    const refreshUsers = () => {
      const list = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user) list.push({ clientId, ...state.user });
      });
      setUsers(list);
    };
    provider.awareness.on('change', refreshUsers);
    refreshUsers();

    return () => {
      provider.awareness.off('change', refreshUsers);
      view?.destroy();
      provider.destroy();
      providerRef.current = null;
    };
  }, [id, user.id, user.name]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← Back
          </Link>
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
            {status}
          </span>
          {role && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{role}</span>
          )}
          <select
            value={language}
            onChange={(e) => providerRef.current?.setLanguage(e.target.value)}
            disabled={role === 'viewer'}
            className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
          >
            {Object.entries(LANGUAGES).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {users.map((u) => (
            <span
              key={u.clientId}
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: u.color }}
            >
              {u.name}
              {u.clientId === myId ? ' (you)' : ''}
            </span>
          ))}
        </div>
      </header>
      {error && <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}