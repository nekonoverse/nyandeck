FROM node:22-alpine AS base

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# Copy the @nekonoverse/ui package (submodule content)
COPY .nekonoverse/packages/ui /app/.nekonoverse/packages/ui
COPY . .

FROM base AS dev
EXPOSE 3001
CMD ["npx", "vite", "dev", "--host", "0.0.0.0", "--port", "3001"]
