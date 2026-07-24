import PartnerHubCompaniesSubcategory from "@/components/companies/partnerhub-companies-subcategory";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
};

export default async function CompaniesSubcategoryPage({ params }: PageProps) {
  const { categorySlug, subcategorySlug } = await params;

  return (
    <div className="app-sidebar-pad min-h-full bg-kenoo-white">
      <PartnerHubCompaniesSubcategory
        categorySlug={categorySlug}
        subcategorySlug={subcategorySlug}
      />
    </div>
  );
}
