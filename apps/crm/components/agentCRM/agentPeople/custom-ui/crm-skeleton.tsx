"use client";

import React from 'react';
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import Image from 'next/image';
import { motion } from 'framer-motion';

interface CRMSkeletonProps {
  /**
   * Number of skeleton rows to display
   * @default 12
   */
  count?: number;
  /**
   * Ref callback for scroll syncing - receives the element and index
   */
  onRef?: (el: HTMLDivElement | null, index: number) => void;
  /**
   * Scroll handler for syncing scroll position across rows
   */
  onScroll?: (e: React.UIEvent<HTMLDivElement>, index: number) => void;
  /**
   * Column widths for the left section (name column width)
   * @default 301
   */
  nameColumnWidth?: number;
}

/**
 * CRM Loading Skeleton
 * 
 * Displays a single centered fallback company image with a wiggle animation and pause
 */
export function CRMSkeleton({ 
  count = 12, 
  onRef,
  onScroll,
  nameColumnWidth = 301
}: CRMSkeletonProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-0 pt-16">
      <Image
        src={FALLBACK_ICON_URL}
        alt="Loading"
        width={180}
        height={180}
        className="rounded-full object-cover aspect-square"
      />
      <div className="w-48 h-1 bg-neutral-200 rounded-full overflow-hidden -mt-9">
        <motion.div
          className="h-full bg-[#e2f85c] rounded-full"
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
