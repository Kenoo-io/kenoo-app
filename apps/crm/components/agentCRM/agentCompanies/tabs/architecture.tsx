import Technologies from "./technologies";
import SubOrganizations from "./sub-organizations";
import Funding from "./funding";
import EmployeeCount from "./employee-count";
import AnnualRevenue from "./annual-revenue";
import Representative from "./representative";

interface ArchitectureProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBooleanChange?: (field: string) => (value: boolean) => void;
}

export default function Architecture({ formData, handleInputChange, handleBooleanChange }: ArchitectureProps) {
  const handleRepresentativeToggle = (value: boolean) => {
    if (handleBooleanChange) {
      handleBooleanChange("is_representative")(value);
    }
  };

  return (
    <div className="space-y-8">
      <Representative formData={formData} onToggleChange={handleRepresentativeToggle} />
      <AnnualRevenue formData={formData} handleInputChange={handleInputChange} />
      <Funding formData={formData} />
      <EmployeeCount formData={formData} handleInputChange={handleInputChange} />
      <SubOrganizations formData={formData} />
      <Technologies formData={formData} />
    </div>
  );
}
