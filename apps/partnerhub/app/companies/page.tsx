import PartnerHubCompaniesIndex from "@/components/companies/partnerhub-companies-index";

export const dynamic = "force-dynamic";

export default function CompaniesPage() {
  return (
    <div className="app-sidebar-pad min-h-full bg-kenoo-white">
      <PartnerHubCompaniesIndex />
    </div>
  );
}
