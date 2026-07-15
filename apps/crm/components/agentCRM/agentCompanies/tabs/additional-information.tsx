import { Input } from "@/components/ui/borderless-input";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { UserDisplay } from "@/components/ui/user-display";

interface AdditionalInformationProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AdditionalInformation({ 
  formData, 
  handleInputChange 
}: AdditionalInformationProps) {
  // Function to format timestamps
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), "MMM d, yyyy h:mm a");
    }
    if (timestamp instanceof Date) {
      return format(timestamp, "MMM d, yyyy h:mm a");
    }
    return timestamp;
  };

  return (
    <Card className="bg-white/50 backdrop-blur-sm shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Created at:</span>
                  <Input
                    placeholder="Created at"
                    value={formatTimestamp(formData.createdAt)}
                    readOnly
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Created by:</span>
                  <div className="relative flex-1">
                    <Lock className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <UserDisplay 
                      userId={formData.createdBy} 
                      className="pl-6 opacity-75"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Alexa ranking:</span>
                  <Input
                    placeholder="Alexa ranking"
                    value={formData.alexaRanking || ""}
                    readOnly
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">

            <div>
              <div className="border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-32">Updated at:</span>
                  <Input
                    placeholder="Updated at"
                    value={formatTimestamp(formData.updatedAt)}
                    readOnly
                    className="border-0 focus-visible:ring-0 focus:ring-0 bg-transparent"
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