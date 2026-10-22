import { products as defaultProducts } from './products.js'

// 假设：price 和 totalPrice 单位为元，价格最多两位小数。
// 只在计算中转成整数分；容许浮点表示造成的微小误差。
export function toCents (price) {
  const cents = Math.round(price * 100)
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
      !Number.isSafeInteger(cents) || Math.abs(price * 100 - cents) > 0.000001) {
    throw new TypeError('价格必须是非负金额，最多两位小数且在安全范围内')
  }
  return cents
}

// 每次创建都复制商品，避免不同购物车或测试共享可变数据。
export function createCart (products = defaultProducts) {
  const ids = new Set()
  for (const product of products) {
    if (typeof product.id !== 'string' || !product.id.trim() || ids.has(product.id) ||
        typeof product.name !== 'string' || !product.name.trim() ||
        typeof product.description !== 'string' || !product.description.trim() ||
        !Number.isSafeInteger(product.quantityAvailable) || product.quantityAvailable < 0) {
      throw new TypeError('商品数据无效或商品编号重复')
    }
    if (!Number.isSafeInteger(toCents(product.price) * product.quantityAvailable)) {
      throw new RangeError('商品总金额超出安全范围')
    }
    ids.add(product.id)
  }
  return { products: products.map(product => ({ ...product })), items: [] }
}

function findProduct (cart, productId) {
  const product = cart.products.find(product => product.id === productId)
  if (!product) throw new Error('商品不存在')
  return product
}

function checkQuantity (quantity) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError('数量必须是正整数')
  }
}

function findItem (cart, productId) {
  const item = cart.items.find(item => item.productId === productId)
  if (!item) throw new Error('购物车中没有该商品')
  return item
}

export function listProducts (cart) {
  return cart.products.map(product => {
    const quantity = cart.items.find(item => item.productId === product.id)?.quantity ?? 0
    return { ...product, available: product.quantityAvailable - quantity }
  })
}

// 重复添加合并数量；所有校验通过后才修改状态。
export function addToCart (cart, productId, quantity) {
  checkQuantity(quantity)
  const product = findProduct(cart, productId)
  const item = cart.items.find(item => item.productId === productId)
  const newQuantity = (item?.quantity ?? 0) + quantity
  if (newQuantity > product.quantityAvailable) throw new RangeError('库存不足')
  const totalPrice = toCents(product.price) * newQuantity / 100
  if (item) {
    item.quantity = newQuantity
    item.totalPrice = totalPrice
  } else cart.items.push({ productId, quantity, totalPrice })
}

// quantity 为目标数量，不是增加量；删除商品使用 removeFromCart。
export function updateQuantity (cart, productId, quantity) {
  checkQuantity(quantity)
  const product = findProduct(cart, productId)
  const item = findItem(cart, productId)
  if (quantity > product.quantityAvailable) throw new RangeError('库存不足')
  item.quantity = quantity
  item.totalPrice = toCents(product.price) * quantity / 100
}

export function removeFromCart (cart, productId) {
  findItem(cart, productId)
  cart.items = cart.items.filter(item => item.productId !== productId)
}

export function clearCart (cart) {
  cart.items = []
}

export function getCartSummary (cart) {
  const items = cart.items.map(item => {
    const product = findProduct(cart, item.productId)
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      totalPrice: item.totalPrice
    }
  })
  const totalCents = items.reduce((sum, item) => sum + toCents(item.totalPrice), 0)
  if (!Number.isSafeInteger(totalCents)) throw new RangeError('总金额超出安全范围')
  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents
  }
}

// 先验证整张订单，再扣库存，避免部分商品已扣库存后才发现错误。
export function checkout (cart) {
  if (cart.items.length === 0) throw new Error('购物车为空，无法结账')
  const receipt = getCartSummary(cart)
  for (const item of cart.items) {
    checkQuantity(item.quantity)
    if (item.quantity > findProduct(cart, item.productId).quantityAvailable) {
      throw new RangeError('库存不足')
    }
  }
  for (const item of cart.items) {
    findProduct(cart, item.productId).quantityAvailable -= item.quantity
  }
  clearCart(cart)
  return receipt
}
