import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-indigo-600">Hello, {user.name}</h1>
      <button
        onClick={logout}
        className="mt-4 rounded bg-gray-800 px-4 py-2 text-white"
      >
        Log out
      </button>
    </div>
  );
}