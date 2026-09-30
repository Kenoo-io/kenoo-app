import { CreateTemplatePage } from "@/components/create-template-page";

export default async function CreateTemplateRoute({ params, searchParams }: { params: Promise<{ channel: string }>; searchParams: Promise<{ format?: string }> }) {
  const { channel } = await params;
  const { format } = await searchParams;
  return <CreateTemplatePage channel={channel} initialFormat={format} />;
}
