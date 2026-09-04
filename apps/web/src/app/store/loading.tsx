import { ProductGridSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="relative overflow-hidden bg-slate-200 rounded-3xl h-[200px] animate-pulse" />
      <div className="flex items-center gap-4 py-4">
        <div className="w-16 h-16 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
