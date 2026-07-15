import { Input } from "@/components/ui/borderless-input";
import { Card, CardContent } from "@/components/ui/card";
import { LeadSourceSelect } from "@/components/ui/searches/leads-lead-source-search";

interface BasicInformationProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  duplicateEmail: string | null;
  handleSelectChange: (field: string) => (value: string) => void;
}

export default function BasicInformation({ 
  formData, 
  handleInputChange, 
  duplicateEmail,
  handleSelectChange 
}: BasicInformationProps) {
  return (
    <Card className="bg-white/50 backdrop-blur-sm shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">First Name:</span>
                  <Input
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange("firstName")}
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Last Name:</span>
                  <Input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange("lastName")}
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Email:</span>
                  <Input
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange("email")}
                    className={`border-0 focus-visible:ring-0 focus:ring-0 bg-transparent ${duplicateEmail ? "text-red-500" : ""}`}
                  />
                </div>
              </div>
              {duplicateEmail && (
                <p className="text-sm text-red-500 ml-36">{duplicateEmail}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">LinkedIn:</span>
                  <Input
                    placeholder="LinkedIn URL"
                    value={formData.linkedin}
                    onChange={handleInputChange("linkedin")}
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Source:</span>
                  <LeadSourceSelect
                    value={formData.source}
                    onValueChange={handleSelectChange("source")}
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent w-full [&>*]:border-0 [&>*]:bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 