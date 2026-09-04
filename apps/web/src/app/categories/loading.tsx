import { ProductGridSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
      <div className="h-4 w-72 bg-slate-200 rounded-lg animate-pulse" />
      <ProductGridSkeleton count={12} />
    </div>
  );
}
