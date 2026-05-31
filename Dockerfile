FROM --platform=linux/amd64 node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable

# By copying only the package.json and package-lock.json here, we ensure that the following `-deps` steps are independent of the source code.
# Therefore, the `-deps` steps will be skipped if only the source code changes.
COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --recursive

FROM --platform=linux/amd64 base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

FROM --platform=linux/amd64 base AS build-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

FROM --platform=linux/amd64 build-deps AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm build

FROM --platform=linux/amd64 base AS runtime
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD node ./dist/server/entry.mjs