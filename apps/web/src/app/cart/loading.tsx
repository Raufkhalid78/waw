export default function Loading() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-10 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-16 h-16 bg-slate-200 rounded-xl animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
