import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-indigo-600">Login</h1>
      <Link to="/register" className="text-blue-600 underline">Need an account?</Link>
    </div>
  );
}