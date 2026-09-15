import { NextResponse } from "next/server";

import { getGitHubRepositoryBranch, listGitHubInstallationRepositories, listGitHubRepositoryBranches } from "@/lib/github-app";
import { TaskGitHubError, requireTaskGitHubContext } from "@/lib/task-github-server";

export async function GET(request: Request) {
  try {
    const { connection } = await requireTaskGitHubContext();
    const repositories = await listGitHubInstallationRepositories(connection.provider_account_id!);
    const repository = new URL(request.url).searchParams.get("repository");
    if (!repository) return NextResponse.json({ repositories });
    if (!repositories.some((item) => item.full_name === repository)) {
      return NextResponse.json({ error: "Repository is not granted to this installation" }, { status: 403 });
    }
    const [details, branches] = await Promise.all([
      getGitHubRepositoryBranch(connection.provider_account_id!, repository),
      listGitHubRepositoryBranches(connection.provider_account_id!, repository),
    ]);
    return NextResponse.json({ repositories, selected: { repository: details.repository.full_name, baseBranch: details.branch, sha: details.sha }, branches });
  } catch (error) {
    const status = error instanceof TaskGitHubError ? error.status : 500;
    console.error("[projects] list GitHub repositories:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load repositories" }, { status });
  }
}
