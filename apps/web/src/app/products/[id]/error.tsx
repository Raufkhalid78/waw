"use client";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
      <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Unable to load product information. Please check your connection and retry.
      </p>
      <button
        onClick={reset}
        className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-5 py-2 rounded-lg text-sm transition-all cursor-pointer"
      >
        Retry
      </button>
    </div>
  );
}
