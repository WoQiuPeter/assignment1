import readline from 'node:readline'
import {
  createCart, listProducts, addToCart, updateQuantity,
  removeFromCart, clearCart, getCartSummary, checkout, toCents
} from './cart.js'

export const helpText = `命令行购物车 | 金额单位：元
list                 查看商品和可添加库存
add P1 2             添加 2 本笔记本（数量为增加量）
set P1 3             将笔记本数量改为 3（数量为目标值）
remove P1            删除整行商品
cart                 查看购物车
clear                清空购物车
checkout             结账、扣减库存并退出
help                 查看帮助
exit                 退出（不结账）`

export function formatMoney (cents) {
  return `${(cents / 100).toFixed(2)} 元`
}

function formatSummary (summary) {
  if (summary.items.length === 0) return '购物车为空'
  return [
    ...summary.items.map(item =>
      `${item.productId} ${item.name} × ${item.quantity} = ${formatMoney(toCents(item.totalPrice))}`),
    `共 ${summary.totalQuantity} 件，总计 ${formatMoney(summary.totalCents)}`
  ].join('\n')
}

// 命令解析和业务计算分开；这里只负责参数、提示和调用函数。
export function executeCommand (cart, line) {
  const parts = line.trim().split(/\s+/)
  const [command, productId, textQuantity] = parts
  if (!command) return { message: '', exit: false }
  const counts = { list: 1, add: 3, set: 3, remove: 2, cart: 1, clear: 1, checkout: 1, help: 1, exit: 1 }
  if (!Object.hasOwn(counts, command)) throw new Error('未知命令，输入 help 查看帮助')
  if (parts.length !== counts[command]) throw new Error('参数数量不正确，输入 help 查看用法')
  let message
  switch (command) {
    case 'list':
      message = listProducts(cart).map(product =>
        `${product.id} ${product.name} | ${product.description} | ${formatMoney(toCents(product.price))} | 可添加 ${product.available}`
      ).join('\n')
      break
    case 'add':
    case 'set': {
      // 不用 parseInt，防止把 2abc 或 2.5 悄悄当成 2。
      if (!/^[1-9]\d*$/.test(textQuantity)) throw new RangeError('数量必须是正整数')
      const quantity = Number(textQuantity)
      if (command === 'add') addToCart(cart, productId, quantity)
      else updateQuantity(cart, productId, quantity)
      message = '购物车已更新'
      break
    }
    case 'remove':
      removeFromCart(cart, productId)
      message = '商品已删除'
      break
    case 'clear':
      clearCart(cart)
      message = '购物车已清空'
      break
    case 'cart':
      message = formatSummary(getCartSummary(cart))
      break
    case 'checkout':
      // 假设：成功结账结束会话；空车等结账错误仍返回选择界面。
      return { message: `结账成功\n${formatSummary(checkout(cart))}`, exit: true }
    case 'help':
      message = helpText
      break
    case 'exit':
      return { message: '再见！', exit: true }
  }
  return { message, exit: false }
}

export async function runCli ({ input = process.stdin, output = process.stdout } = {}) {
  const cart = createCart()
  const reader = readline.createInterface({ input, crlfDelay: Infinity })
  const showSelection = () => {
    output.write(`${executeCommand(cart, 'list').message}\n请选择商品（add ID 数量），或输入 help：\n> `)
  }
  output.write(`${helpText}\n`)
  showSelection()
  try {
    for await (const line of reader) {
      try {
        const result = executeCommand(cart, line)
        if (result.message) output.write(`${result.message}\n`)
        if (result.exit) break
      } catch (error) {
        output.write(`错误：${error.message}\n`)
      }
      showSelection()
    }
  } finally {
    reader.close()
  }
}
