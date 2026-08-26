import React from "react";
import { Zap } from "lucide-react";

// ─── Star Rating ─────────────────────────────────────────────────
export function RatingStars({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-px">
        {Array.from({ length: full }).map((_, i) => (
          <StarIcon key={`f${i}`} fill="full" />
        ))}
        {half && <StarIcon fill="half" />}
        {Array.from({ length: empty }).map((_, i) => (
          <StarIcon key={`e${i}`} fill="empty" />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-ink-60">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-ink-40">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}

function StarIcon({ fill }: { fill: "full" | "half" | "empty" }) {
  return (
    <svg className="w-3 h-3" viewBox="0 0 20 20">
      <defs>
        <linearGradient id="half-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="50%" stopColor="#F5A623" />
          <stop offset="50%" stopColor="#E0DED9" />
        </linearGradient>
      </defs>
      <path
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        fill={
          fill === "full"
            ? "#F5A623"
            : fill === "half"
              ? "url(#half-fill)"
              : "#E0DED9"
        }
      />
    </svg>
  );
}

// ─── Waw Express Badge ────────────────────────────────────────────
export function WawExpressBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 bg-gold text-ink font-black uppercase tracking-wider rounded-md ${
        size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5"
      }`}
    >
      <Zap className={size === "md" ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} />
      <span>Express</span>
    </span>
  );
}

// ─── Discount Pill ────────────────────────────────────────────────
export function DiscountPill({ percent }: { percent: number }) {
  return (
    <span className="inline-block bg-danger text-surface-card text-[10px] font-bold px-2 py-0.5 rounded-md">
      -{percent}%
    </span>
  );
}

// ─── Verified Seller Badge ────────────────────────────────────────
export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}
