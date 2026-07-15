"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/sidebar-scroll-area";
import { 
  ChevronLeft,
  Search,
  HardDrive
} from "lucide-react";
import { useLeadsSidebar } from "./LeadsSidebarContext";
import Link from "next/link";

export function LeadsSidebar() {
  const { isCollapsed, setIsCollapsed } = useLeadsSidebar();

  const menuItems = [
    { 
      name: 'Storage',
      icon: <HardDrive className="h-[18px] w-[18px] stroke-[1.5]" />,
      href: '/agents/crm/people'
    },
    { 
      name: 'Search',
      icon: <Search className="h-[18px] w-[18px] stroke-[1.5]" />,
      href: '/agents/crm/people/search'
    }
  ];

  return (
    <div 
      className={`
        fixed top-0 left-0 h-screen 
        transition-all duration-500 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'} 
        bg-transparent z-40
      `}
    >
      <div className="flex h-full flex-col relative">
        {/* Main Navigation */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2 pt-60">
            <Button
              variant="ghost"
              size="icon"
              className={`
                w-full justify-start 
                text-slate-600
                transition-all duration-500 ease-in-out
                relative group hover:bg-transparent
                ${isCollapsed ? 'px-2' : ''}
              `}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <div className={`
                flex items-center relative z-10
                ${isCollapsed ? 'justify-center' : ''}
              `}>
                <div className="relative group">
                  <div className="
                    relative z-10 p-3 
                    bg-neutral-100/80 backdrop-blur-md 
                    rounded-full shadow-inner border border-neutral-200/50
                    transition-all duration-300 ease-in-out
                    group-hover:bg-neutral-100
                    group-hover:shadow-inner group-hover:border-neutral-200
                    group-hover:scale-95
                    group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)]
                  ">
                    <ChevronLeft 
                      className={`
                        h-[18px] w-[18px] stroke-[1.5] 
                        text-slate-600
                        transition-all duration-500 ease-in-out
                        transform ${isCollapsed ? 'rotate-180' : ''}
                      `} 
                    />
                  </div>
                </div>
                {!isCollapsed && (
                  <span className="
                    ml-3 font-light
                    transition-all duration-500 ease-in-out
                    opacity-100
                  ">
                    Collapse
                  </span>
                )}
              </div>
            </Button>
            {menuItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  className={`
                    w-full justify-start 
                    text-slate-600
                    transition-all duration-500 ease-in-out
                    relative group hover:bg-transparent
                    ${isCollapsed ? 'px-2' : ''}
                  `}
                >
                  <div className={`
                    flex items-center relative z-10
                    ${isCollapsed ? 'justify-center' : ''}
                  `}>
                    <div className="relative group">
                      <div className="
                        relative z-10 p-3 
                        bg-neutral-100/80 backdrop-blur-md 
                        rounded-full shadow-inner border border-neutral-200/50
                        transition-all duration-300 ease-in-out
                        group-hover:bg-neutral-100
                        group-hover:shadow-inner group-hover:border-neutral-200
                        group-hover:scale-95
                        group-hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.15)]
                      ">
                        {item.icon}
                      </div>
                    </div>
                    {!isCollapsed && (
                      <span className="
                        ml-3 font-light
                        transition-all duration-500 ease-in-out
                        opacity-100
                      ">
                        {item.name}
                      </span>
                    )}
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 