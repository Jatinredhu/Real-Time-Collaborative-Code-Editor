import { useParams } from 'react-router-dom';

export default function Editor() {
  const { id } = useParams();
  return <h1 className="p-8 text-3xl font-bold text-indigo-600">Editor for doc {id}</h1>;
}