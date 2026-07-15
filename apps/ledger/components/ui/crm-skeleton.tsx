"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const FALLBACK_ICON_URL =
  "https://assets.wallsentertainment.com/avatar-fallback-v2.png";

interface CRMSkeletonProps {
  /**
   * Kept for API compatibility with CRM tables — unused in the centered loader.
   */
  count?: number;
  onRef?: (el: HTMLDivElement | null, index: number) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>, index: number) => void;
  nameColumnWidth?: number;
}

/**
 * Centered loading indicator used by Forecast / Recipients screens.
 */
export function CRMSkeleton(_props: CRMSkeletonProps = {}) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-0 pt-16">
      <Image
        src={FALLBACK_ICON_URL}
        alt="Loading"
        width={180}
        height={180}
        className="aspect-square rounded-full object-cover"
      />
      <div className="-mt-9 h-1 w-48 overflow-hidden rounded-full bg-neutral-200">
        <motion.div
          className="h-full rounded-full bg-[#e2f85c]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>
    </div>
  );
}
