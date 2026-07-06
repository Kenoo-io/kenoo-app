import { startMetaOAuthLogin } from "@/lib/start-meta-oauth";

/** Facebook-compatible login entry: https://adpilot.walls.agency/api/oauth/meta/login */
export async function GET() {
  return startMetaOAuthLogin();
}
