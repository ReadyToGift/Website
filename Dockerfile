FROM --platform=linux/amd64 node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable

# By copying only the package.json and package-lock.json here, we ensure that the following `-deps` steps are independent of the source code.
# Therefore, the `-deps` steps will be skipped if only the source code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install

FROM --platform=linux/amd64 base AS build-deps
RUN --mount=type=cache,id=pnpm-node26,target=/pnpm/store pnpm install --frozen-lockfile

FROM --platform=linux/amd64 build-deps AS build
ARG DOMAIN
ARG ALLOWED_DOMAINS
COPY . .
RUN --mount=type=cache,id=pnpm-node26,target=/pnpm/store \
	DOMAIN="$DOMAIN" ALLOWED_DOMAINS="$ALLOWED_DOMAINS" pnpm build \
	&& pnpm deploy --filter . --prod /app/prod

FROM --platform=linux/amd64 gcr.io/distroless/nodejs26-debian13@sha256:13e3ac17e2911d238622fea7808a7a161ba6b33a41e542ded6e399387e1dbc84 AS runtime

WORKDIR /app

COPY --from=build /app/prod/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["./dist/server/entry.mjs"]
