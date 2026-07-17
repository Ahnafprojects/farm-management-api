# ---- deps stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime stage ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY docs ./docs

RUN mkdir -p /app/data && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
