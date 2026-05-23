import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-8xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-400 mb-8">Page not found</p>
      <Link
        to="/"
        className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl text-sm font-medium transition"
      >
        Go home
      </Link>
    </div>
  );
}
