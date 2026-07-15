import * as React from "react";

import { cn } from "@walls/utils";

const CardCRM = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-[50px] border bg-card", className)}
    {...props}
  />
));
CardCRM.displayName = "CardCRM";

const CardHeaderCRM = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeaderCRM.displayName = "CardHeaderCRM";

const CardTitleCRM = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitleCRM.displayName = "CardTitleCRM";

const CardDescriptionCRM = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescriptionCRM.displayName = "CardDescriptionCRM";

const CardContentCRM = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props} />
));
CardContentCRM.displayName = "CardContentCRM";

const CardFooterCRM = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooterCRM.displayName = "CardFooterCRM";

export {
  CardCRM,
  CardHeaderCRM,
  CardFooterCRM,
  CardTitleCRM,
  CardDescriptionCRM,
  CardContentCRM,
};
