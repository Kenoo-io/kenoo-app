import { createAdminClient } from "@walls/supabase/admin";
import { randomInt } from "node:crypto";

import { getAccountMembership, getCurrentUserId, resolveActiveAccountId } from "@/lib/account-context";
import { getSafeGitHubConnectionForAccount } from "@/lib/github-connections-server";

export type TaskGitHubBranch = {
  task_id: string;
  repository_full_name: string;
  base_branch: string;
  base_sha: string;
  branch_name: string;
  branch_deleted_at?: string | null;
};

export async function requireTaskGitHubContext(options: { write?: boolean } = {}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new TaskGitHubError("Unauthorized", 401);
  const accountId = await resolveActiveAccountId(userId);
  if (!accountId) throw new TaskGitHubError("No active account", 400);
  const membership = await getAccountMembership(userId, accountId);
  if (!membership) throw new TaskGitHubError("Not a member of this account", 403);
  if (options.write && !["owner", "admin"].includes(membership.role.toLowerCase())) {
    throw new TaskGitHubError("Only workspace owners and admins can create GitHub branches", 403);
  }
  const connection = await getSafeGitHubConnectionForAccount(accountId);
  if (!connection?.provider_account_id) throw new TaskGitHubError("No active GitHub connection", 404);
  return { userId, accountId, connection };
}

export async function getTaskForAccount(taskId: string, accountId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_tasks")
    .select("id, title, projects!inner(account_id)")
    .eq("id", taskId)
    .eq("projects.account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new TaskGitHubError("Task not found in active account", 404);
  return data as { id: string; title: string };
}

// Use exactly two real words: one adjective and one noun. The large pools keep
// the friendly part of the branch name varied; the task ID guarantees uniqueness.
const BRANCH_ADJECTIVES = `amber ancient arctic astral atomic azure balanced blazing bold brave bright brisk bronze calm candid cedar celestial clever cobalt cosmic crisp crystal daring dashing dawn deep determined dewdrop dynamic eager early electric ember epic fearless fiery frosty gentle gilded glimmering golden grand green hardy hidden honest hopeful icy indigo ivory jade jolly keen kind lively lucky lunar luminous magnetic majestic mellow mighty misty modern moonlit natural nimble noble northern oceanic olive opal optimistic orange peaceful peachy pearl perfect pine playful plucky polished prairie precise proud quiet quick radiant rapid red regal resilient rich robust rosy royal ruby sage scarlet serene shadowy shining silver sapphire sleek smart solar sparkling spirited spring steady stellar stormy strong summer sunny swift teal thunder timeless tiny tranquil true twilight vibrant velvet verdant vivid warm wild willow wintry wise wondrous zesty agile airy alpine autumn breezy brilliant cherry classic clouded coral daring dusty evergreen fancy feathered fresh frosted glowing graceful hazel iron jade lemon mellow midnight mossy neat navy opulent orchard pale pink polar poised pure rainbow sandy sapphire secret smoky smooth snowy solid spruce starry steel subtle sunset sweet tender tidy topaz twinkling valiant vivid wandering welcome windswept`.split(" ");

const BRANCH_NOUNS = `albatross anchor antelope apple archipelago badger bay beaver bison blossom brook canyon cardinal castle cedar chameleon cloud comet condor coral cove crane creek cricket dolphin dragon eagle ember falcon fern field finch firefly fox galaxy garden gazelle glacier glen grove harbor hawk heron hill horizon island jaguar kestrel kingfisher koala lake lantern lark lemur lion lynx maple marsh meadow meteor moose mountain narwhal nightingale oak ocean orca orchard otter owl panda panther parrot pebble phoenix pine planet pond prairie puffin quail rabbit raven reef ridge river robin rose sailboat salmon seal sequoia shore sparrow spring star stone summit swan tiger trail tree trout turtle valley viper whale willow wind wolf wren yak zephyr acorn aurora badger basil bumblebee butterfly cactus campfire canyon caribou cherry chestnut clover coast cobra constellation cypress dahlia daisy delta dune elm falcon flame forest fountain gecko granite heron honeybee hummingbird iris jasmine juniper lagoon lava leaf lighthouse magnolia manta meadow moon moth nectar orchid osprey palm peony petal puma quartz raccoon raindrop redwood robin sable sage sandpiper seashell snowflake songbird spruce sunrise thistle thunderbird toucan tulip violet walnut waterfall wave wildflower woodpecker`.split(" ");

function randomWord(words: string[]): string {
  return words[randomInt(words.length)];
}

function randomBranchDescriptor(): string {
  return `${randomWord(BRANCH_ADJECTIVES)}-${randomWord(BRANCH_NOUNS)}`;
}

export function taskBranchName(task: { id: string }): string {
  const taskId = task.id.replace(/-/g, "").slice(0, 8) || "task";

  return `kenoo-${taskId}/${randomBranchDescriptor()}`;
}

export class TaskGitHubError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
