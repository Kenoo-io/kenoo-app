"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const pulseAnimation = {
  '@keyframes subtle-pulse': {
    '0%, 100%': {
      opacity: '0.3',
    },
    '50%': {
      opacity: '0.4',
    },
  },
  '.animate-subtle-pulse': {
    animation: 'subtle-pulse 3s ease-in-out infinite',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes subtle-pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.4; }
    }
    .animate-subtle-pulse {
      animation: subtle-pulse 3s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-all duration-300 ease-in-out",
      orientation === "vertical" &&
        "h-full w-1.5 border-l border-l-transparent p-[1px] hover:w-2 hover:p-[1.5px]",
      orientation === "horizontal" &&
        "h-1.5 flex-col border-t border-t-transparent p-[1px] hover:h-2 hover:p-[1.5px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb 
      className={cn(
        "relative flex-1 rounded-full",
        "bg-gradient-to-b from-gray-300/30 to-gray-400/30",
        "hover:from-gray-300/40 hover:to-gray-400/40",
        "transition-all duration-300 ease-out",
        "backdrop-blur-sm",
        "animate-subtle-pulse"
      )} 
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar } 