FROM mcr.microsoft.com/playwright:v1.50.0-noble
WORKDIR /app
RUN npm install --no-audit --no-fund playwright@1.50.0
COPY qa ./qa
CMD ["node", "qa/browser.cjs"]
