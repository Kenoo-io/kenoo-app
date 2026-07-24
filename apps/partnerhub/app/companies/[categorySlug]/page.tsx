import PartnerHubCompaniesCategory from "@/components/companies/partnerhub-companies-category";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ categorySlug: string }>;
};

export default async function CompaniesCategoryPage({ params }: PageProps) {
  const { categorySlug } = await params;

  return (
    <div className="app-sidebar-pad min-h-full bg-kenoo-white">
      <PartnerHubCompaniesCategory categorySlug={categorySlug} />
    </div>
  );
}
