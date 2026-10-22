// 用真实公开仓库 URL 一次性更新项目配置，不需要安装第三方包。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const repoUrl = process.argv[2]
if (!/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+\.git$/.test(repoUrl ?? '') ||
    /YOUR_|pobengtsson\/bth012-a1-part-a/.test(repoUrl)) {
  throw new Error('需要自己的真实 GitHub HTTPS 克隆地址（以 .git 结尾）')
}
const webUrl = repoUrl.slice(0, -4)
const dockerfile = join(root, 'Dockerfile')
const docker = readFileSync(dockerfile, 'utf8')
if (!/^ARG REPO_URL=.+$/m.test(docker)) throw new Error('Dockerfile 中没有 REPO_URL')
writeFileSync(dockerfile, docker.replace(/^ARG REPO_URL=.+$/m, `ARG REPO_URL=${repoUrl}`), 'utf8')
const packagePath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
pkg.repository = { type: 'git', url: `git+${repoUrl}` }
pkg.homepage = webUrl
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
for (const relative of ['README.md', 'docs/提交清单.md', 'docs/需求与验证.md']) {
  const path = join(root, relative)
  const text = readFileSync(path, 'utf8').replaceAll('https://github.com/YOUR_USERNAME/assignment1.git', repoUrl)
    .replace('当前仍含占位地址，不能视为完成提交。', '个人仓库地址已配置，见 docs/仓库地址.md；发布状态以实际记录为准。')
    .replace('个人公开 GitHub 地址仍待填写', '个人公开 GitHub 地址已配置（见仓库地址.md）')
  writeFileSync(path, text, 'utf8')
}
mkdirSync(join(root, 'docs'), { recursive: true })
writeFileSync(join(root, 'docs/仓库地址.md'), `# 个人仓库地址\n\n- 源码：${webUrl}\n- HTTPS 克隆：${repoUrl}\n- 自动测试：${webUrl}/actions\n\n公开状态、推送与测试结论以实际验证记录为准。\n`, 'utf8')
console.log(`Repository configuration updated: ${webUrl}`)
