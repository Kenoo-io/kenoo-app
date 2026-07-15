"use client";

import React from 'react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface DynamicTooltipProps {
  children: React.ReactElement;
  content: string;
}

export const DynamicTooltip = ({ children, content }: DynamicTooltipProps) => {
  const [side, setSide] = React.useState<"top" | "bottom">("top");

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const topSpace = rect.top;
    const bottomSpace = window.innerHeight - rect.bottom;

    // If near top (sticky header area) and more space below, show below
    // Otherwise show above (default)
    setSide(topSpace < 120 && bottomSpace > topSpace ? "bottom" : "top");
  };

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {React.cloneElement(children, {
          onMouseEnter: (e: React.MouseEvent) => {
            handleMouseEnter(e);
            if (children.props.onMouseEnter) {
              children.props.onMouseEnter(e);
            }
          }
        })}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          avoidCollisions={true}
          collisionPadding={{
            top: 80,    // Account for sticky header
            bottom: 24,
            left: 16,
            right: 16
          }}
          className="z-[10000] rounded-[25px] bg-neutral-100 backdrop-blur-sm px-3 py-1.5 text-xs text-neutral-700 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

