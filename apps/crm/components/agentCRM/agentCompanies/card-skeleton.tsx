import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const CardSkeleton = () => (
  <Card className="w-full bg-neutral-100 backdrop-blur-md shadow-inner border border-neutral-200/50 transition-all duration-300 group relative overflow-hidden">
    <CardContent className="p-4 relative z-10">
      <div className="flex items-center justify-start gap-6">
        {/* Creator Profile Picture - Far Left */}
        <div className="flex-shrink-0">
          <Skeleton className="w-14 h-14 rounded-full border border-neutral-200" />
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4 md:gap-16 items-center">
          {/* Creator name - 10 cols mobile, 3 cols desktop */}
          <div className="col-span-10 md:col-span-3 flex items-center relative min-w-0 overflow-hidden">
            <div className="flex flex-col h-[46px] relative justify-center">
              <Skeleton className="h-5 w-32 md:w-48 mb-2" />
            </div>
          </div>
          
          {/* Mobile Send Button - 2 cols mobile, hidden on desktop */}
          <div className="col-span-2 md:hidden flex items-center justify-end pr-2">
            <Skeleton className="w-14 h-14 rounded-full" />
          </div>
          
          {/* Niche info - hidden on mobile, 3 cols desktop */}
          <div className="hidden md:flex md:col-span-3 items-center">
            <span className="hidden md:block border-r border-gray-300 mr-4 h-4" />
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          
          {/* Country info - hidden on mobile, 2 cols desktop */}
          <div className="hidden md:flex md:col-span-2 justify-start">
            <div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
          
          {/* Followers count - hidden on mobile, 2 cols desktop */}
          <div className="hidden md:flex md:col-span-2 justify-start">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          
          {/* Scouted by photo - hidden on mobile, 1 col on desktop */}
          <div className="hidden md:flex items-center md:col-span-1 ml-4">
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
          
          {/* Eye icon - hidden on mobile, 1 col on desktop */}
          <div className="hidden md:flex items-center justify-end md:col-span-1">
            <Skeleton className="w-5 h-5 rounded-full" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default CardSkeleton; 