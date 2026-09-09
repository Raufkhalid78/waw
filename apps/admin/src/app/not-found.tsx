"use client";

import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
      <div className="text-6xl font-black text-slate-200 dark:text-slate-800">404</div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Page Not Found</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        This admin page doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-all"
      >
        Back to Admin Home
      </Link>
    </div>
  );
}
