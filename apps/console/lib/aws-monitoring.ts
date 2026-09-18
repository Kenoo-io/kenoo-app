import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from "@aws-sdk/client-cloudwatch";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
} from "@aws-sdk/client-cost-explorer";
import { DescribeServicesCommand, ECSClient } from "@aws-sdk/client-ecs";
import { GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

type AwsMonitoringConfig = {
  region: string;
  cluster: string;
  services: string[];
  queueUrls: string[];
  credentials: AwsCredentials;
};

export type AwsMonitoringData = {
  monthToDateCost: number | null;
  forecastCost: number | null;
  currency: string;
  costsByService: Array<{ service: string; amount: number }>;
  services: Array<{
    name: string;
    status: string;
    desiredCount: number;
    runningCount: number;
    pendingCount: number;
    cpuUtilization: number | null;
    memoryUtilization: number | null;
  }>;
  queues: Array<{
    name: string;
    visibleMessages: number;
    inFlightMessages: number;
    oldestMessageAgeSeconds: number | null;
  }>;
  warnings: string[];
};

function envList(name: string, fallback: string[] = []) {
  const value = process.env[name]?.trim();
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback;
}

function envValue(name: string) {
  return process.env[name]?.trim() || null;
}

function awsConfig(): AwsMonitoringConfig | null {
  const accessKeyId = envValue("AWS_MONITORING_ACCESS_KEY_ID");
  const secretAccessKey = envValue("AWS_MONITORING_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) return null;

  return {
    region: envValue("AWS_MONITORING_REGION") ?? "us-east-2",
    cluster: envValue("AWS_MONITORING_ECS_CLUSTER") ?? "kenoo-systems",
    services: envList("AWS_MONITORING_ECS_SERVICES", ["people-enrichment"]),
    queueUrls: envList("AWS_MONITORING_SQS_QUEUE_URLS"),
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken: envValue("AWS_MONITORING_SESSION_TOKEN") ?? undefined,
    },
  };
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function firstDayOfNextMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function numberOrNull(value: string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nameFromQueueUrl(queueUrl: string) {
  try {
    return new URL(queueUrl).pathname.split("/").filter(Boolean).pop() ?? queueUrl;
  } catch {
    return queueUrl;
  }
}

function latestMetricValue(results: { Values?: number[] }[], id: string) {
  return results.find((result) => result.Id === id)?.Values?.[0] ?? null;
}

export function awsMonitoringIsConfigured() {
  return awsConfig() !== null;
}

export async function getAwsMonitoring(): Promise<AwsMonitoringData> {
  const config = awsConfig();
  if (!config) throw new Error("AWS monitoring credentials are not configured");

  const clientOptions = { region: config.region, credentials: config.credentials };
  const costExplorer = new CostExplorerClient({ region: "us-east-1", credentials: config.credentials });
  const ecs = new ECSClient(clientOptions);
  const sqs = new SQSClient(clientOptions);
  const cloudWatch = new CloudWatchClient(clientOptions);
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const warnings: string[] = [];

  const [costResult, forecastResult, ecsResult, queueResults] = await Promise.allSettled([
    costExplorer.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: dateOnly(startOfMonth), End: dateOnly(new Date(now.getTime() + 24 * 60 * 60 * 1000)) },
      Granularity: "MONTHLY",
      Metrics: ["UnblendedCost"],
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    })),
    costExplorer.send(new GetCostForecastCommand({
      TimePeriod: { Start: dateOnly(now), End: dateOnly(firstDayOfNextMonth(now)) },
      Granularity: "MONTHLY",
      Metric: "UNBLENDED_COST",
    })),
    config.services.length
      ? ecs.send(new DescribeServicesCommand({ cluster: config.cluster, services: config.services }))
      : Promise.resolve({ services: [] }),
    Promise.all(config.queueUrls.map(async (QueueUrl) => {
      const response = await sqs.send(new GetQueueAttributesCommand({
        QueueUrl,
        AttributeNames: [
          "ApproximateNumberOfMessages",
          "ApproximateNumberOfMessagesNotVisible",
          "ApproximateAgeOfOldestMessage",
        ],
      }));
      return { QueueUrl, attributes: response.Attributes ?? {} };
    })),
  ]);

  if (costResult.status === "rejected") warnings.push("AWS cost data is unavailable. Confirm Cost Explorer is enabled and this role can read it.");
  if (forecastResult.status === "rejected") warnings.push("AWS monthly forecast is not available yet.");
  if (ecsResult.status === "rejected") warnings.push("ECS service data is unavailable. Check the cluster, service names, and IAM permissions.");
  if (queueResults.status === "rejected") warnings.push("SQS queue data is unavailable. Check the queue URLs and IAM permissions.");

  const metricQueries: MetricDataQuery[] = ecsResult.status === "fulfilled"
    ? (ecsResult.value.services ?? []).flatMap((service, index) => {
        const name = service.serviceName;
        if (!name) return [];
        const dimensions = [
          { Name: "ClusterName", Value: config.cluster },
          { Name: "ServiceName", Value: name },
        ];
        return [
          {
            Id: `cpu${index}`,
            MetricStat: { Metric: { Namespace: "AWS/ECS", MetricName: "CPUUtilization", Dimensions: dimensions }, Period: 300, Stat: "Average" },
            ReturnData: true,
          },
          {
            Id: `memory${index}`,
            MetricStat: { Metric: { Namespace: "AWS/ECS", MetricName: "MemoryUtilization", Dimensions: dimensions }, Period: 300, Stat: "Average" },
            ReturnData: true,
          },
        ];
      })
    : [];

  const metricsResult = metricQueries.length
    ? await cloudWatch.send(new GetMetricDataCommand({
        StartTime: new Date(now.getTime() - 60 * 60 * 1000),
        EndTime: now,
        ScanBy: "TimestampDescending",
        MetricDataQueries: metricQueries,
      })).catch(() => {
        warnings.push("CloudWatch CPU and memory metrics are unavailable.");
        return null;
      })
    : null;
  const metricResults = metricsResult?.MetricDataResults ?? [];

  const costGroups = costResult.status === "fulfilled"
    ? costResult.value.ResultsByTime?.flatMap((period) => period.Groups ?? []) ?? []
    : [];
  const costByService = costGroups
    .map((group) => ({ service: group.Keys?.[0] ?? "Other", amount: numberOrNull(group.Metrics?.UnblendedCost?.Amount) ?? 0 }))
    .filter((group) => group.amount > 0)
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 8);
  const monthToDateCost = costByService.reduce((total, group) => total + group.amount, 0) || null;
  const currency = costResult.status === "fulfilled"
    ? costGroups[0]?.Metrics?.UnblendedCost?.Unit ?? "USD"
    : "USD";

  return {
    monthToDateCost,
    forecastCost: forecastResult.status === "fulfilled"
      ? numberOrNull(forecastResult.value.Total?.Amount)
      : null,
    currency,
    costsByService: costByService,
    services: (ecsResult.status === "fulfilled" ? ecsResult.value.services ?? [] : []).map((service, index) => ({
      name: service.serviceName ?? "Unknown service",
      status: service.status ?? "UNKNOWN",
      desiredCount: service.desiredCount ?? 0,
      runningCount: service.runningCount ?? 0,
      pendingCount: service.pendingCount ?? 0,
      cpuUtilization: latestMetricValue(metricResults, `cpu${index}`),
      memoryUtilization: latestMetricValue(metricResults, `memory${index}`),
    })),
    queues: queueResults.status === "fulfilled"
      ? queueResults.value.map(({ QueueUrl, attributes }) => ({
          name: nameFromQueueUrl(QueueUrl),
          visibleMessages: Number(attributes.ApproximateNumberOfMessages ?? 0),
          inFlightMessages: Number(attributes.ApproximateNumberOfMessagesNotVisible ?? 0),
          oldestMessageAgeSeconds: numberOrNull(attributes.ApproximateAgeOfOldestMessage),
        }))
      : [],
    warnings,
  };
}
