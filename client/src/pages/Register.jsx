import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-indigo-600">Register</h1>
      <Link to="/login" className="text-blue-600 underline">Already have an account?</Link>
    </div>
  );
}