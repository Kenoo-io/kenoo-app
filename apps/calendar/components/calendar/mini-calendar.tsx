"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, PanelTopClose, PanelTopOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type MiniCalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  dealDates?: Date[];
  mode?: "single";
  showHeader?: boolean;
  collapsible?: boolean;
};

export function MiniCalendar({
  selected,
  onSelect,
  className,
  dealDates = [],
  showHeader = true,
  collapsible = false,
}: MiniCalendarProps) {
  const [displayMonth, setDisplayMonth] = React.useState(
    () => startOfMonth(selected ?? new Date())
  );
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = React.useState(false);
  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const handleCollapseToggle = () => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);

    if (isCollapsed) {
      // Restore the header first, then expand the calendar grid.
      setIsHeaderCollapsed(false);
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(false);
      }, 320);
      return;
    }

    // Collapse the calendar grid first, then hide and reposition the header controls.
    setIsCollapsed(true);
    collapseTimerRef.current = setTimeout(() => {
      setIsHeaderCollapsed(true);
    }, 340);
  };

  React.useEffect(() => {
    if (selected) {
      setDisplayMonth(startOfMonth(selected));
    }
  }, [selected]);

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [displayMonth]);

  return (
    <div className={cn("w-full select-none", className)}>
      {showHeader && (
        <motion.div layout className="mb-1 flex items-center">
          <AnimatePresence initial={false}>
            {!isHeaderCollapsed && (
              <motion.h2
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden whitespace-nowrap text-[13px] font-medium tracking-tight text-kenoo-ink"
              >
                {format(displayMonth, "MMMM yyyy")}
              </motion.h2>
            )}
          </AnimatePresence>

          <motion.div
            layout
            className={cn("flex items-center", !isHeaderCollapsed && "ml-auto")}
          >
            <AnimatePresence initial={false}>
              {!isHeaderCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-center overflow-hidden"
                >
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setDisplayMonth((m) => subMonths(m, 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-kenoo-muted transition-colors hover:bg-kenoo-subtle hover:text-kenoo-ink"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setDisplayMonth((m) => addMonths(m, 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-kenoo-muted transition-colors hover:bg-kenoo-subtle hover:text-kenoo-ink"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {collapsible && (
              <button
                type="button"
                aria-label={isCollapsed ? "Expand mini calendar" : "Minimize mini calendar"}
                title={isCollapsed ? "Expand mini calendar" : "Minimize mini calendar"}
                aria-expanded={!isCollapsed}
                onClick={handleCollapseToggle}
                className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-kenoo-muted transition-colors hover:bg-kenoo-subtle hover:text-kenoo-ink"
              >
                {isCollapsed ? (
                  <PanelTopOpen className="h-3.5 w-3.5" />
                ) : (
                  <PanelTopClose className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}

      <motion.div
        initial={false}
        animate={{ height: isCollapsed ? 0 : "auto", opacity: isCollapsed ? 0 : 1 }}
        transition={{ height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
        className="overflow-hidden"
        aria-hidden={isCollapsed}
      >
        <div className="mb-0.5 grid grid-cols-7">
          {WEEKDAYS.map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="flex h-5 items-center justify-center text-[10px] font-medium text-kenoo-muted"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const inMonth = isSameMonth(day, displayMonth);
            const selectedDay = selected ? isSameDay(day, selected) : false;
            const today = isToday(day);
            const hasDeal = dealDates.some((d) => isSameDay(d, day));

            return (
              <button
                key={day.toISOString()}
                type="button"
                tabIndex={isCollapsed ? -1 : undefined}
                onClick={() => onSelect?.(day)}
                className={cn(
                  "relative mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors",
                  !inMonth && "text-kenoo-muted/40",
                  inMonth &&
                    !selectedDay &&
                    !today &&
                    "text-kenoo-ink hover:bg-neutral-100",
                  today &&
                    !selectedDay &&
                    "font-medium text-kenoo-ink ring-1 ring-inset ring-[#4285F4]/70",
                  selectedDay &&
                    "bg-[#4285F4] font-medium text-white hover:bg-[#4285F4]"
                )}
              >
                {format(day, "d")}
                {hasDeal && (
                  <span
                    className={cn(
                      "absolute bottom-0 left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full",
                      selectedDay ? "bg-kenoo-white" : "bg-kenoo-red"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

MiniCalendar.displayName = "MiniCalendar";
