"use client";

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl ${className}`}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
      <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden">
        <SkeletonPulse className="w-full h-full rounded-2xl" />
      </div>
      <div className="space-y-2">
        <SkeletonPulse className="h-3.5 w-3/4" />
        <SkeletonPulse className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-3 w-12" />
        </div>
        <SkeletonPulse className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden">
        <SkeletonPulse className="w-full h-full rounded-2xl" />
      </div>
      <SkeletonPulse className="h-3.5 w-20" />
      <SkeletonPulse className="h-2.5 w-12" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 overflow-hidden">
          <SkeletonPulse className="w-full h-full rounded-2xl" />
        </div>
        <div className="space-y-2 flex-1">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-3 w-48" />
        </div>
        <SkeletonPulse className="h-8 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-4">
      <div className="relative overflow-hidden bg-slate-100 rounded-3xl h-[280px] sm:h-[340px]">
        <SkeletonPulse className="w-full h-full" />
      </div>
    </div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden">
          <SkeletonPulse className="w-full h-full rounded-2xl" />
        </div>
        <div className="space-y-2 flex-1">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-3 w-24" />
        </div>
      </div>
      <SkeletonPulse className="h-3 w-full" />
      <SkeletonPulse className="h-3 w-2/3" />
    </div>
  );
}
