import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="mb-6 text-8xl font-bold text-gray-200">404</div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">
        Page Not Found
      </h1>
      <p className="mb-8 max-w-md text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          to="/"
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
