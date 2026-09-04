import { ProductGridSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 flex-1 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="h-10 w-10 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-28 bg-slate-200 rounded-full animate-pulse shrink-0" />
        ))}
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
