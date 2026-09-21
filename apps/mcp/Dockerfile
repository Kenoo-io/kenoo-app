# Build from the repository root:
# docker build -f apps/mcp/Dockerfile .
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 AS lambda-adapter

FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mcp/package.json apps/mcp/package.json
RUN pnpm install --frozen-lockfile --filter @walls/mcp...

COPY apps/mcp apps/mcp
RUN pnpm --filter @walls/mcp build \
  && pnpm --filter @walls/mcp --prod deploy --legacy /runtime

FROM node:22-bookworm-slim
WORKDIR /app

# The adapter translates Lambda invocation events into ordinary HTTP requests.
COPY --from=lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=build /runtime ./

ENV NODE_ENV=production
ENV PORT=3002
ENV AWS_LWA_PORT=3002
EXPOSE 3002

CMD ["node", "dist/index.js", "--http", "--port", "3002"]
