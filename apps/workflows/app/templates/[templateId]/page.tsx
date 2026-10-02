import { CreateTemplatePage } from "@/components/create-template-page";

export default async function EditTemplateRoute({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  return <CreateTemplatePage templateId={templateId} channel="email" />;
}
