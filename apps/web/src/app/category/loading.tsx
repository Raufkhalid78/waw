import { ProductGridSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
      <div className="h-4 w-96 bg-slate-200 rounded-lg animate-pulse" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
