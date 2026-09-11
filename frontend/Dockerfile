FROM node:20-alpine AS build
WORKDIR /srv
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY tests ./tests
RUN npx tsc -b && npx vite build

FROM nginx:1.27-alpine
COPY --from=build /srv/dist /usr/share/nginx/html
COPY nginx-templates/default.conf.template /etc/nginx/templates/default.conf.template
# Local/compose default; Railway overrides via the API_UPSTREAM service variable.
ENV API_UPSTREAM=api:4000
EXPOSE 80
