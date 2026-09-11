"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error(error.message, "GlobalError", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
          <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500 text-center max-w-md">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-5 py-2 rounded-lg text-sm transition-all cursor-pointer"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
