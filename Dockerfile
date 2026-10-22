FROM node:24-bookworm

WORKDIR /app

# 提交前必须把默认值替换为自己的公开仓库 HTTPS URL，并推送此修改。
# 不使用教师仓库，否则容器里运行的将是教师模板。
ARG REPO_URL=https://github.com/WoQiuPeter/assignment1.git
RUN git clone --depth 1 "$REPO_URL" .
RUN npm ci && npm test

ENTRYPOINT ["node", "src/index.js"]
