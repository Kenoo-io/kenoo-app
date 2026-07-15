"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/sidebar-scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  DollarSign,
  MapPin,
  Globe,
  Factory,
  HardDrive,
  RotateCw
} from "lucide-react";
import { useCompaniesSearchSidebar } from "./CompaniesSearchSidebarContext";
import { useState, useEffect } from "react";
import Link from "next/link";

const industries = [
  "Information Technology & Services",
  "Construction",
  "Marketing & Advertising",
  "Real Estate",
  "Health, Wellness & Fitness",
  "Management Consulting",
  "Computer Software",
  "Internet",
  "Retail",
  "Financial Services",
  "Consumer Services",
  "Hospital & Healthcare",
  "Automotive",
  "Restaurants",
  "Education Management",
  "Food & Beverages",
  "Design",
  "Hospitality",
  "Accounting",
  "Events Services"
];

const employeeRanges = [
  { value: "1,10", label: "1-10", count: "16.4M" },
  { value: "11,20", label: "11-20", count: "1.8M" },
  { value: "21,50", label: "21-50", count: "1.3M" },
  { value: "51,100", label: "51-100", count: "441.9K" },
  { value: "101,200", label: "101-200", count: "238.5K" },
  { value: "201,500", label: "201-500", count: "144.7K" },
  { value: "501,1000", label: "501-1000", count: "48.5K" },
  { value: "1001,2000", label: "1001-2000", count: "23.9K" },
  { value: "2001,5000", label: "2001-5000", count: "12.9K" },
  { value: "5001,10000", label: "5001-10000", count: "4.3K" },
  { value: "10001,1000000", label: "10001+", count: "5.3K" },
];

export function CompaniesSearchSidebar() {
  const { isCollapsed, setIsCollapsed, filters, setFilters } = useCompaniesSearchSidebar();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Add event listener for closing expanded sections
  useEffect(() => {
    const handleCloseExpandedSections = () => {
      setExpandedSections({});
    };

    window.addEventListener('closeExpandedSections', handleCloseExpandedSections);
    
    return () => {
      window.removeEventListener('closeExpandedSections', handleCloseExpandedSections);
    };
  }, []);

  const toggleSection = (sectionName: string) => {
    if (isCollapsed) {
      // When collapsed, close all other sections and toggle the clicked one
      setExpandedSections(prev => {
        const wasExpanded = prev[sectionName];
        return {
          ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
          [sectionName]: !wasExpanded
        };
      });
    } else {
      // When expanded, just toggle the clicked section
      setExpandedSections(prev => ({
        ...prev,
        [sectionName]: !prev[sectionName]
      }));
    }
  };

  const filterSections = [
    {
      name: 'Industry',
      icon: <Factory className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Select
          value={filters.industry}
          onValueChange={(value) => setFilters({ ...filters, industry: value })}
        >
          <SelectTrigger className="w-full bg-white/50 backdrop-blur-sm">
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent className="z-[9999] bg-white/50 backdrop-blur-sm border-none shadow-sm">
            {industries.map((industry) => (
              <SelectItem 
                key={industry} 
                value={industry}
                className="hover:bg-gray-100/50 focus:bg-gray-100/50"
              >
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    {
      name: 'Company Name',
      icon: <Building2 className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Input 
          placeholder="Enter company name..."
          className="w-full bg-white/50 backdrop-blur-sm"
          value={filters.companyName}
          onChange={(e) => setFilters({ ...filters, companyName: e.target.value })}
        />
      )
    },
    {
      name: 'Company Size',
      icon: <Users className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {employeeRanges.map((range) => (
            <div key={range.value} className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.companySize.includes(range.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilters({
                        ...filters,
                        companySize: [...filters.companySize, range.value]
                      });
                    } else {
                      setFilters({
                        ...filters,
                        companySize: filters.companySize.filter(size => size !== range.value)
                      });
                    }
                  }}
                />
                <Label className="text-sm">{range.label}</Label>
              </div>
              <span className="text-sm text-gray-500">{range.count}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      name: 'Revenue',
      icon: <DollarSign className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input 
              type="number"
              placeholder="Min"
              className="w-full bg-white/50 backdrop-blur-sm"
              value={filters.revenueMin}
              onChange={(e) => setFilters({ ...filters, revenueMin: e.target.value })}
            />
            <Input 
              type="number"
              placeholder="Max"
              className="w-full bg-white/50 backdrop-blur-sm"
              value={filters.revenueMax}
              onChange={(e) => setFilters({ ...filters, revenueMax: e.target.value })}
            />
          </div>
        </div>
      )
    },
    {
      name: 'Location',
      icon: <MapPin className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Input 
          placeholder="Enter location..."
          className="w-full bg-white/50 backdrop-blur-sm"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        />
      )
    },
    {
      name: 'Website',
      icon: <Globe className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Input 
          placeholder="Enter website domain..."
          className="w-full bg-white/50 backdrop-blur-sm"
          value={filters.website}
          onChange={(e) => {
            const value = e.target.value;
            setFilters({ 
              ...filters, 
              website: value,
              companyName: value 
            });
          }}
        />
      )
    },
  ];

  return (
    <div className={`
      fixed top-0 left-0 h-screen 
      transition-all duration-500 ease-in-out
      ${isCollapsed ? 'w-16' : 'w-64'} 
      bg-transparent z-[100]
      overflow-hidden
    `}>
      <div className="flex h-full flex-col relative">
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-2 pt-24">
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
                <div className={`
                  overflow-hidden transition-all duration-500 ease-in-out
                  ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                `}>
                  <span className="font-light whitespace-nowrap">
                    Collapse
                  </span>
                </div>
              </div>
            </Button>

            {filterSections.map((section) => (
              <div key={section.name} className="relative">
                <Button
                  variant="ghost"
                  className={`
                    w-full justify-start 
                    text-slate-600 
                    transition-all duration-500 ease-in-out
                    relative group hover:bg-transparent
                    ${isCollapsed ? 'px-2' : ''}
                  `}
                  onClick={() => toggleSection(section.name)}
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
                        {section.icon}
                      </div>
                    </div>
                    <div className={`
                      overflow-hidden transition-all duration-500 ease-in-out
                      ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3 flex-1 flex items-center justify-between'}
                    `}>
                      <Label className="text-sm font-medium whitespace-nowrap">{section.name}</Label>
                      <ChevronRight 
                        className={`
                          h-4 w-4 
                          transition-all duration-300 ease-in-out
                          transform ${expandedSections[section.name] ? 'rotate-90' : ''}
                        `} 
                      />
                    </div>
                  </div>
                </Button>
                {expandedSections[section.name] && (
                  <div 
                    className={`
                      animate-in 
                      fade-in-0 
                      slide-in-from-left-2
                      duration-500
                      ease-&lsqb;cubic-bezier(0.34,1.56,0.64,1)&rsqb;
                      data-[state=closed]:animate-out
                      data-[state=closed]:fade-out-0
                      data-[state=closed]:slide-out-to-left-2
                      data-[state=closed]:duration-300
                      data-[state=closed]:ease-in-out
                      ${isCollapsed ? 'fixed left-16 min-w-[250px] z-[9999]' : 'ml-12 mr-2'}
                      before:absolute before:inset-0 before:bg-white/5 before:backdrop-blur-[1px]
                      before:rounded-lg before:opacity-0 before:transition-opacity
                      before:duration-500 hover:before:opacity-100
                      after:absolute after:inset-0 after:rounded-lg
                      after:shadow-[0_0_0_1px_rgba(0,0,0,0.01)]
                      after:transition-shadow after:duration-500
                      hover:after:shadow-[0_0_0_1px_rgba(0,0,0,0.05)]
                    `}
                    style={isCollapsed ? {
                      top: `${section.name === 'Industry' ? '155px' : 
                            section.name === 'Company Name' ? '219px' : 
                            section.name === 'Company Size' ? '290px' : 
                            section.name === 'Revenue' ? '342px' : 
                            section.name === 'Location' ? '403px' : '465px'}`,
                      transform: 'perspective(1000px) rotateX(0deg)',
                      transformOrigin: 'top',
                      transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    } : undefined}
                    onMouseEnter={(e) => {
                      if (isCollapsed) {
                        e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isCollapsed) {
                        e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg)';
                      }
                    }}
                  >
                    <div className="relative z-10">
                      {section.component}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4">
              <div className="h-[1px] bg-gray-200/50 mx-2 mb-4" />

              <div className="space-y-2">
                <Link href="/agents/crm/companies">
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
                          <HardDrive className="h-[18px] w-[18px] stroke-[1.5]" />
                        </div>
                      </div>
                      <div className={`
                        overflow-hidden transition-all duration-500 ease-in-out
                        ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                      `}>
                        <span className="font-light whitespace-nowrap">
                          Database
                        </span>
                      </div>
                    </div>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  className={`
                    w-full justify-start 
                    text-slate-600 
                    transition-all duration-500 ease-in-out
                    relative group hover:bg-transparent
                    ${isCollapsed ? 'px-2' : ''}
                  `}
                  onClick={() => window.location.reload()}
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
                        <RotateCw className="h-[18px] w-[18px] stroke-[1.5]" />
                      </div>
                    </div>
                    <div className={`
                      overflow-hidden transition-all duration-500 ease-in-out
                      ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                    `}>
                      <span className="font-light whitespace-nowrap">
                        Refresh Search
                      </span>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 