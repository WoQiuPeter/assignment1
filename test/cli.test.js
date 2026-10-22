import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PassThrough, Readable } from 'node:stream'
import { createCart, getCartSummary } from '../src/cart.js'
import { executeCommand, formatMoney, helpText, runCli } from '../src/cli.js'

describe('命令解析与显示', () => {
  it('列出商品，包括缺货商品', () => {
    const result = executeCommand(createCart(), 'list')
    expect(result.message).toContain('P1 笔记本 | A5 方格笔记本 | 12.50 元 | 可添加 10')
    expect(result.message).toContain('P4 订书机 | 小号订书机（暂时缺货） | 18.00 元 | 可添加 0')
  })
  it('完整购物命令流程，包括修改、删除、清空和结账', () => {
    const cart = createCart()
    executeCommand(cart, '  add   P1   2  ')
    executeCommand(cart, 'add P2 3')
    expect(executeCommand(cart, 'cart').message).toContain('共 5 件，总计 35.50 元')
    executeCommand(cart, 'set P1 1')
    executeCommand(cart, 'remove P2')
    expect(executeCommand(cart, 'checkout').message).toContain('共 1 件，总计 12.50 元')
    expect(executeCommand(cart, 'cart').message).toBe('购物车为空')
    executeCommand(cart, 'add P3 1')
    expect(executeCommand(cart, 'clear').message).toBe('购物车已清空')
    expect(getCartSummary(cart).totalCents).toBe(0)
  })
  it.each(['2abc', '2.5', '0', '-1', 'NaN', 'Infinity', '1e2', '9007199254740992'])(
    '拒绝非法文本数量 %s', quantity => {
      expect(() => executeCommand(createCart(), `add P1 ${quantity}`)).toThrow('正整数')
    }
  )
  it.each(['add P1', 'list extra', 'exit extra', 'set P1 2 extra'])(
    '拒绝错误的参数个数：%s', command => {
      expect(() => executeCommand(createCart(), command)).toThrow('参数数量')
    }
  )
  it('未知命令不会执行对象原型上的同名方法', () => {
    expect(() => executeCommand(createCart(), 'toString')).toThrow('未知命令')
  })
  it('空行不改变状态', () => {
    expect(executeCommand(createCart(), '   ')).toEqual({ message: '', exit: false })
  })
  it('help 返回帮助，exit 返回退出标记', () => {
    expect(executeCommand(createCart(), 'help').message).toBe(helpText)
    expect(executeCommand(createCart(), 'exit')).toEqual({ message: '再见！', exit: true })
  })
  it.each([[0, '0.00 元'], [30, '0.30 元'], [1250, '12.50 元']])(
    '把 %i 分显示为 %s', (cents, expected) => {
      expect(formatMoney(cents)).toBe(expected)
    }
  )
})

describe('终端交互和真实启动入口', () => {
  it('成功结账结束会话，不执行排在后面的命令', async () => {
    const output = new PassThrough()
    let text = ''
    output.on('data', chunk => { text += chunk.toString() })
    await runCli({ input: Readable.from(['add P1 1\ncheckout\nadd P2 1\nexit\n']), output })
    expect(text).toContain('结账成功')
    expect(text).toContain('总计 12.50 元')
    expect(text).not.toContain('再见！')
    expect(text.slice(text.indexOf('结账成功'))).not.toContain('请选择商品')
  })
  it('空车结账错误后继续选择，并在每次操作后重显商品', async () => {
    const output = new PassThrough()
    let text = ''
    output.on('data', chunk => { text += chunk.toString() })
    await runCli({ input: Readable.from(['checkout\nadd P1 1\nexit\n']), output })
    expect(text).toContain('错误：购物车为空')
    expect(text).toContain('购物车已更新')
    expect(text.match(/请选择商品/g)).toHaveLength(3)
    expect(text).toContain('再见！')
  })
  it('报告输入错误后继续执行后续命令', async () => {
    const input = Readable.from(['\nwrong\nadd P1 99\nadd P1 2\ncart\nexit\n'])
    const output = new PassThrough()
    let text = ''
    output.on('data', chunk => { text += chunk.toString() })
    await runCli({ input, output })
    expect(text).toContain('错误：未知命令')
    expect(text).toContain('错误：库存不足')
    expect(text).toContain('共 2 件，总计 25.00 元')
    expect(text).toContain('再见！')
  })
  it('输入流结束时正常返回，不要求必须输入 exit', async () => {
    const output = new PassThrough()
    let text = ''
    output.on('data', chunk => { text += chunk.toString() })
    await runCli({ input: Readable.from(['cart\n']), output })
    expect(text).toContain('购物车为空')
  })
  it('node src/index.js 能处理多行输入、结账并正常退出', () => {
    const entry = fileURLToPath(new URL('../src/index.js', import.meta.url))
    const result = spawnSync(process.execPath, [entry], {
      input: 'add P1 2\nadd P2 3\ncheckout\ncart\nexit\n',
      encoding: 'utf8', timeout: 10000
    })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('结账成功')
    expect(result.stdout).toContain('共 5 件，总计 35.50 元')
    expect(result.stdout).not.toContain('购物车为空')
    expect(result.stdout).not.toContain('再见！')
  })
})
