"use client";

import React, { useRef, useEffect, useState } from "react";
import { CardCRM as Card, CardContentCRM as CardContent } from "@/components/ui/card-crm";

type ColumnWidths = {
  date: number;
  type: number;
  description: number;
  recipient: number;
  amount: number;
  status: number;
  source: number;
};

interface LedgerTableHeaderProps {
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  scrollableRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  isScrollingRef: React.MutableRefObject<boolean>;
  columnWidths: ColumnWidths;
  setColumnWidths: React.Dispatch<React.SetStateAction<ColumnWidths>>;
}

export function LedgerTableHeader({
  headerScrollRef,
  scrollableRefs,
  isScrollingRef,
  columnWidths,
  setColumnWidths,
}: LedgerTableHeaderProps) {
  const [isResizing, setIsResizing] = useState<keyof ColumnWidths | null>(null);
  const resizingRef = useRef<{
    column: keyof ColumnWidths;
    startX: number;
    startWidth: number;
  } | null>(null);

  const startResize = (e: React.MouseEvent, column: keyof ColumnWidths) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(column);
    resizingRef.current = {
      column,
      startX: e.clientX,
      startWidth: columnWidths[column],
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", stopResize);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { column, startX, startWidth } = resizingRef.current;
    const delta = e.clientX - startX;
    const minWidth = 80;
    setColumnWidths((prev) => ({
      ...prev,
      [column]: Math.max(minWidth, startWidth + delta),
    }));
  };

  const stopResize = () => {
    setIsResizing(null);
    resizingRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", stopResize);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", stopResize);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  const ResizeHandle = ({ column }: { column: keyof ColumnWidths }) => {
    const isCurrentlyResizing = isResizing === column;
    return (
      <div
        className="absolute top-0 h-full w-3 cursor-col-resize group z-20"
        style={{ right: "0px" }}
        onMouseDown={(e) => startResize(e, column)}
      >
        <div
          className={`absolute top-0 bottom-0 w-px transition-opacity ${
            isCurrentlyResizing
              ? "opacity-100 bg-neutral-400"
              : "opacity-0 group-hover:opacity-100 bg-neutral-300"
          }`}
          style={{ right: "0px" }}
        />
      </div>
    );
  };

  return (
    <Card
      className="w-full rounded-none rounded-tl-lg bg-neutral-100 shadow-inner border-x border-neutral-200/50 border-b border-neutral-200/50 sticky top-0 z-40 overflow-hidden"
      style={{ backgroundColor: "#f5f5f5" }}
    >
      <CardContent className="py-2 relative bg-neutral-100">
        <div
          ref={headerScrollRef as React.RefObject<HTMLDivElement>}
          className="flex items-center min-w-max pl-0 overflow-x-auto scrollbar-hide"
          onScroll={(e) => {
            if (isScrollingRef.current) return;
            const target = e.currentTarget;
            isScrollingRef.current = true;
            const scrollLeft = target.scrollLeft;
            scrollableRefs.current.forEach((ref) => {
              if (ref && ref !== target) ref.scrollLeft = scrollLeft;
            });
            requestAnimationFrame(() => {
              isScrollingRef.current = false;
            });
          }}
        >
          <div className="flex items-center min-w-max pl-8" style={{ gap: "0.5rem" }}>
            <div
              className="flex items-center flex-shrink-0 pl-3 relative"
              style={{ width: `${columnWidths.date}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Date
              </span>
              <ResizeHandle column="date" />
            </div>
            <div
              className="flex items-center flex-shrink-0 relative"
              style={{ width: `${columnWidths.type}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Type
              </span>
              <ResizeHandle column="type" />
            </div>
            <div
              className="flex items-center flex-shrink-0 relative"
              style={{ width: `${columnWidths.description}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Description
              </span>
              <ResizeHandle column="description" />
            </div>
            <div
              className="flex items-center flex-shrink-0 relative"
              style={{ width: `${columnWidths.recipient}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Recipient / Payer
              </span>
              <ResizeHandle column="recipient" />
            </div>
            <div
              className="flex items-center flex-shrink-0 relative justify-end"
              style={{ width: `${columnWidths.amount}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Amount
              </span>
              <ResizeHandle column="amount" />
            </div>
            <div
              className="flex items-center flex-shrink-0 relative"
              style={{ width: `${columnWidths.status}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Status
              </span>
              <ResizeHandle column="status" />
            </div>
            <div
              className="flex items-center flex-shrink-0 relative"
              style={{ width: `${columnWidths.source}px` }}
            >
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide truncate">
                Source
              </span>
              <ResizeHandle column="source" />
            </div>
            <div style={{ width: "24px" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
