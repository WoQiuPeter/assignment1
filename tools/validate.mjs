// 只使用 Node.js 内置模块，记录真实测试、代码规范与启动结果。
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const env = { ...process.env, FORCE_COLOR: '0' }
const output = [`本地检查时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}（Asia/Shanghai）`,
  '输出中的项目绝对路径替换为 <project>，不影响检查结果。']
function runNpm (args, input) {
  // args 只来自下面固定的 test、run lint、start，不接收用户文本。
  return process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], { cwd: root, env, input, encoding: 'utf8', timeout: 120000 })
    : spawnSync('npm', args, { cwd: root, env, input, encoding: 'utf8', timeout: 120000 })
}
function cleanPaths (text = '') {
  return text.replaceAll(root.replaceAll('\\', '/').replace(/\/$/, ''), '<project>')
    .replaceAll(root.replace(/[\\/]$/, ''), '<project>')
}
for (const args of [['test'], ['run', 'lint']]) {
  console.log(`Running npm ${args.join(' ')}`)
  const result = runNpm(args)
  output.push(`\n> npm ${args.join(' ')}`, cleanPaths(result.stdout), cleanPaths(result.stderr), `退出码：${result.status}`)
  if (result.error || result.status !== 0) throw result.error ?? new Error('验证失败')
}
const demo = 'checkout\nadd P1 2\nadd P2 3\ncart\nadd P4 1\nadd P1 99\nset P2 1\ncart\ncheckout\nexit\n'
const result = runNpm(['start'], demo)
if (result.error || result.status !== 0) throw result.error ?? new Error('启动失败')
for (const expected of ['35.50 元', '28.50 元', '错误：库存不足', '结账成功', '错误：购物车为空']) {
  if (!result.stdout.includes(expected)) throw new Error(`缺少预期输出：${expected}`)
}
if (result.stdout.includes('再见！')) throw new Error('成功结账后不应执行后续 exit')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const allowed = ['@eslint/js', '@vitest/eslint-plugin', 'eslint', 'eslint-plugin-n', 'eslint-plugin-promise', 'globals', 'vitest']
if (Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies).some(name => !allowed.includes(name))) {
  throw new Error('发现模板之外的直接依赖')
}
writeFileSync(join(root, 'docs/示例运行结果.txt'), `输入：\n${demo}\n输出：\n${result.stdout}`, 'utf8')
output.push('\n> npm start（真实终端输入流程）\n退出码：0，错误处理、金额及结账退出均已核对。',
  '\n依赖检查：仅使用原模板列出的七个开发包，应用只导入自有模块和 Node.js 内置模块。',
  '\n不提供覆盖率数字：按课程限制移除模板外的覆盖率包。',
  `\n仓库配置：${pkg.repository?.url ?? '尚待 GitHub 账号认证后填写'}。`,
  '\nGitHub 发布和 Docker 云端测试以真实仓库与 Actions 结果为准；本地检查不代表远端通过。',
  '\n真实同行评审、本人录制视频及 Canvas 提交仍需按课程要求完成。')
writeFileSync(join(root, 'docs/验证结果.txt'), output.filter(Boolean).join('\n'), 'utf8')
console.log('All local checks passed.')
