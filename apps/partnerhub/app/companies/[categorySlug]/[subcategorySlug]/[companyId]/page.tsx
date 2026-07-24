import PartnerHubCompaniesDetail from "@/components/companies/viewCompanies/partnerhub-companies-detail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    categorySlug: string;
    subcategorySlug: string;
    companyId: string;
  }>;
};

export default async function CompaniesDetailPage({ params }: PageProps) {
  const { categorySlug, subcategorySlug, companyId } = await params;

  return (
    <div className="app-sidebar-pad min-h-full bg-kenoo-white">
      <PartnerHubCompaniesDetail
        categorySlug={categorySlug}
        subcategorySlug={subcategorySlug}
        companyId={companyId}
      />
    </div>
  );
}
