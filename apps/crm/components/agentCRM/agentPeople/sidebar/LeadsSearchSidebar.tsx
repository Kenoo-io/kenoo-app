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
  Users,
  Building2,
  MapPin,
  Globe,
  Briefcase,
  Mail,
  HardDrive,
  RotateCw,
  UserCheck
} from "lucide-react";
import { useLeadsSearchSidebar } from "./LeadsSearchSidebarContext";
import { useState, useEffect } from "react";
import Link from "next/link";

const seniorities = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
  { value: "intern", label: "Intern" }
];

const emailStatuses = [
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
  { value: "likely_to_engage", label: "Likely to Engage" },
  { value: "unavailable", label: "Unavailable" }
];

const employeeRanges = [
  { value: "1,10", label: "1-10" },
  { value: "11,50", label: "11-50" },
  { value: "51,200", label: "51-200" },
  { value: "201,500", label: "201-500" },
  { value: "501,1000", label: "501-1,000" },
  { value: "1001,5000", label: "1,001-5,000" },
  { value: "5001,10000", label: "5,001-10,000" },
  { value: "10001,1000000", label: "10,001+" }
];

export function LeadsSearchSidebar() {
  const { isCollapsed, setIsCollapsed, filters, setFilters } = useLeadsSearchSidebar();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
      setExpandedSections(prev => {
        const wasExpanded = prev[sectionName];
        return {
          ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
          [sectionName]: !wasExpanded
        };
      });
    } else {
      setExpandedSections(prev => ({
        ...prev,
        [sectionName]: !prev[sectionName]
      }));
    }
  };

  const filterSections = [
    {
      name: 'Job Titles',
      icon: <Briefcase className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <div className="space-y-2">
          <Input 
            placeholder="Enter job title..."
            className="w-full bg-white/50 backdrop-blur-sm"
            value={filters.personTitles[0] || ''}
            onChange={(e) => setFilters({ ...filters, personTitles: [e.target.value] })}
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={filters.includeSimilarTitles}
              onCheckedChange={(checked) => setFilters({ ...filters, includeSimilarTitles: checked as boolean })}
            />
            <Label className="text-sm">Include similar titles</Label>
          </div>
        </div>
      )
    },
    {
      name: 'Seniority',
      icon: <UserCheck className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {seniorities.map((seniority) => (
            <div key={seniority.value} className="flex items-center space-x-2">
              <Checkbox
                checked={filters.personSeniorities.includes(seniority.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters({
                      ...filters,
                      personSeniorities: [...filters.personSeniorities, seniority.value]
                    });
                  } else {
                    setFilters({
                      ...filters,
                      personSeniorities: filters.personSeniorities.filter(s => s !== seniority.value)
                    });
                  }
                }}
              />
              <Label className="text-sm">{seniority.label}</Label>
            </div>
          ))}
        </div>
      )
    },
    {
      name: 'Person Location',
      icon: <MapPin className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Input 
          placeholder="Enter location..."
          className="w-full bg-white/50 backdrop-blur-sm"
          value={filters.personLocations[0] || ''}
          onChange={(e) => setFilters({ ...filters, personLocations: [e.target.value] })}
        />
      )
    },
    {
      name: 'Company Location',
      icon: <Building2 className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Input 
          placeholder="Enter company location..."
          className="w-full bg-white/50 backdrop-blur-sm"
          value={filters.organizationLocations[0] || ''}
          onChange={(e) => setFilters({ ...filters, organizationLocations: [e.target.value] })}
        />
      )
    },
    {
      name: 'Company Domain',
      icon: <Globe className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <Input 
          placeholder="Enter company domain..."
          className="w-full bg-white/50 backdrop-blur-sm"
          value={filters.organizationDomains[0] || ''}
          onChange={(e) => setFilters({ ...filters, organizationDomains: [e.target.value] })}
        />
      )
    },
    {
      name: 'Email Status',
      icon: <Mail className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <div className="space-y-2">
          {emailStatuses.map((status) => (
            <div key={status.value} className="flex items-center space-x-2">
              <Checkbox
                checked={filters.contactEmailStatus.includes(status.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters({
                      ...filters,
                      contactEmailStatus: [...filters.contactEmailStatus, status.value]
                    });
                  } else {
                    setFilters({
                      ...filters,
                      contactEmailStatus: filters.contactEmailStatus.filter(s => s !== status.value)
                    });
                  }
                }}
              />
              <Label className="text-sm">{status.label}</Label>
            </div>
          ))}
        </div>
      )
    },
    {
      name: 'Company Size',
      icon: <Users className="h-[18px] w-[18px] stroke-[1.5]" />,
      component: (
        <div className="space-y-2">
          {employeeRanges.map((range) => (
            <div key={range.value} className="flex items-center space-x-2">
              <Checkbox
                checked={filters.organizationNumEmployeesRanges.includes(range.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters({
                      ...filters,
                      organizationNumEmployeesRanges: [...filters.organizationNumEmployeesRanges, range.value]
                    });
                  } else {
                    setFilters({
                      ...filters,
                      organizationNumEmployeesRanges: filters.organizationNumEmployeesRanges.filter(r => r !== range.value)
                    });
                  }
                }}
              />
              <Label className="text-sm">{range.label}</Label>
            </div>
          ))}
        </div>
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
          <div className="space-y-4 p-2 pt-16">
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
                      <Label className="text-sm font-normal whitespace-nowrap">{section.name}</Label>
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
                      top: `${section.name === 'Job Titles' ? '119px' : 
                            section.name === 'Seniority' ? '190px' : 
                            section.name === 'Person Location' ? '240px' : 
                            section.name === 'Company Location' ? '302px' : 
                            section.name === 'Company Domain' ? '363px' :
                            section.name === 'Email Status' ? '434px' : '495px'}`,
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
                    <div className="relative z-10 p-2">
                      {section.component}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4">
              <div className="h-[1px] bg-gray-200/50 mx-2 mb-4" />

              <div className="space-y-2">
                <Link href="/agents/crm/leads">
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
                    text-slate-600 hover:text-slate-900 
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