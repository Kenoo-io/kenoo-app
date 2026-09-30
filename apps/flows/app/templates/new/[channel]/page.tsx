import { CreateTemplatePage } from "@/components/create-template-page";

export default async function CreateTemplateRoute({ params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  return <CreateTemplatePage channel={channel} />;
}
