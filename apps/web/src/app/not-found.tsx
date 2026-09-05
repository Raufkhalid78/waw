"use client";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
      <div className="text-6xl font-black text-gray-200">404</div>
      <h1 className="text-xl font-bold text-gray-900">Page Not Found</h1>
      <p className="text-sm text-gray-500 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition-all"
      >
        Back to Home
      </a>
    </div>
  );
}
