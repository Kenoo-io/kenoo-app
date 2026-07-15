import * as React from "react"

import { cn } from "@/lib/utils"

export interface AddressInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** `plain` = no chrome; parent supplies full `className` (e.g. people table toolbar search). */
  variant?: "default" | "plain";
}

const DEFAULT_INPUT_CLASS =
  "flex h-[47px] w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 text-neutral-600 font-normal px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50";

const AddressInput = React.forwardRef<HTMLInputElement, AddressInputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(variant === "default" ? DEFAULT_INPUT_CLASS : null, className)}
        ref={ref}
        {...props}
      />
    );
  },
);
AddressInput.displayName = "AddressInput"

export { AddressInput }
