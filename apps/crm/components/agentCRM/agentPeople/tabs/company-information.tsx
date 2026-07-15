import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CompanySearch } from "@/components/ui/searches/companySearch/company-search";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CompanyInformationProps {
  formData: any;
  handleSelectChange: (field: string) => (value: string | string[]) => void;
}

interface CompanyDetails {
  annualRevenue?: number;
  industry?: string;
  employeeCount?: number;
}

export default function CompanyInformation({ formData, handleSelectChange }: CompanyInformationProps) {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({});

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!formData.companyId) {
        setCompanyDetails({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('annual_revenue, industry, employee_count')
          .eq('id', formData.companyId)
          .single();

        if (error) {
          console.error("Error fetching company details:", error);
          setCompanyDetails({});
          return;
        }

        if (data) {
          setCompanyDetails({
            annualRevenue: data.annual_revenue || undefined,
            industry: data.industry || undefined,
            employeeCount: data.employee_count || undefined,
          });
        } else {
          setCompanyDetails({});
        }
      } catch (error) {
        console.error("Error fetching company details:", error);
        setCompanyDetails({});
      }
    };

    fetchCompanyDetails();
  }, [formData.companyId]);

  const formatRevenue = (revenue?: number) => {
    if (!revenue) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(revenue);
  };

  return (
    <Card className="bg-white/50 backdrop-blur-sm shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 h-10 flex items-center">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-gray-500 w-32">Company:</span>
                  <CompanySearch
                    value={formData.company}
                    onChange={(value, companyId) => {
                      handleSelectChange("company")(value);
                      if (companyId) {
                        handleSelectChange("companyId")(companyId);
                      } else {
                        handleSelectChange("companyId")("");
                      }
                    }}
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent w-full [&>*]:border-0 [&>*]:bg-transparent [&_input]:h-8 [&_input]:py-0"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 h-10 flex items-center">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-gray-500 w-32">Annual Rev:</span>
                  <span className="text-foreground text-sm font-normal">{formatRevenue(companyDetails.annualRevenue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 h-10 flex items-center">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-gray-500 w-32">Industry:</span>
                  <span className="text-foreground text-sm font-normal">{companyDetails.industry || "N/A"}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 h-10 flex items-center">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-gray-500 w-32">Employees:</span>
                  <span className="text-foreground text-sm font-normal">
                    {companyDetails.employeeCount ? companyDetails.employeeCount.toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 