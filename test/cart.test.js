import {
  createCart, listProducts, addToCart, updateQuantity,
  removeFromCart, clearCart, getCartSummary, checkout, toCents
} from '../src/cart.js'

// 使用小而固定的数据，预期值可以手算，不依赖演示商品的价格。
const sampleProducts = [
  { id: 'A', name: '苹果', price: 1.2, quantityAvailable: 3, description: 'test product' },
  { id: 'B', name: '面包', price: 2.5, quantityAvailable: 2, description: 'test product' },
  { id: 'C', name: '牛奶', price: 5.0, quantityAvailable: 0, description: 'test product' }
]
let cart
beforeEach(() => { cart = createCart(sampleProducts) })

describe('createCart / 商品与初始状态', () => {
  it('默认商品具有题目要求的五个字段', () => {
    for (const product of createCart().products) {
      expect(Object.keys(product).sort()).toEqual(['description', 'id', 'name', 'price', 'quantityAvailable'])
    }
  })
  it('新购物车没有商品且金额和数量都是零', () => {
    expect(getCartSummary(cart)).toEqual({ items: [], totalQuantity: 0, totalCents: 0 })
  })
  it('复制商品数据，结账不修改原始目录或其他购物车', () => {
    const other = createCart(sampleProducts)
    addToCart(cart, 'A', 1)
    checkout(cart)
    expect(cart.products[0].quantityAvailable).toBe(2)
    expect(other.products[0].quantityAvailable).toBe(3)
    expect(sampleProducts[0].quantityAvailable).toBe(3)
  })
  it.each([
    { id: '', name: '苹果', price: 1.2, quantityAvailable: 3, description: 'test product' },
    { id: 1, name: '苹果', price: 1.2, quantityAvailable: 3, description: 'test product' },
    { id: 'A', name: '', price: 1.2, quantityAvailable: 3, description: 'test product' },
    { id: 'A', name: 1, price: 1.2, quantityAvailable: 3, description: 'test product' },
    { id: 'A', name: '苹果', price: -0.01, quantityAvailable: 3, description: 'test product' },
    { id: 'A', name: '苹果', price: 0.012, quantityAvailable: 3, description: 'test product' },
    { id: 'A', name: '苹果', price: 1.2, quantityAvailable: -1, description: 'test product' },
    { id: 'A', name: '苹果', price: 1.2, quantityAvailable: 0.5, description: 'test product' },
    { id: 'A', name: '苹果', price: Number.MAX_SAFE_INTEGER, quantityAvailable: 2, description: 'test product' }
  ])('拒绝非法商品数据：%j', product => {
    expect(() => createCart([product])).toThrow()
  })
  it('拒绝重复编号', () => {
    expect(() => createCart([sampleProducts[0], sampleProducts[0]])).toThrow('编号重复')
  })
  it('缺少 description 时拒绝商品数据', () => {
    const product = { ...sampleProducts[0] }
    delete product.description
    expect(() => createCart([product])).toThrow('商品数据无效')
  })
})

describe('addToCart / 添加商品', () => {
  it('添加商品后保存编号和数量', () => {
    addToCart(cart, 'A', 2)
    expect(cart.items).toEqual([{ productId: 'A', quantity: 2, totalPrice: 2.40 }])
  })
  it('同一商品重复添加合并为一行', () => {
    addToCart(cart, 'A', 1)
    addToCart(cart, 'A', 2)
    expect(cart.items).toEqual([{ productId: 'A', quantity: 3, totalPrice: 3.60 }])
  })
  it('允许添加恰好等于库存的数量', () => {
    addToCart(cart, 'A', 3)
    expect(listProducts(cart)[0].available).toBe(0)
  })
  it('校验累计数量，超库存时保留原购物车', () => {
    addToCart(cart, 'A', 2)
    const before = structuredClone(cart)
    expect(() => addToCart(cart, 'A', 2)).toThrow('库存不足')
    expect(cart).toEqual(before)
  })
  it('拒绝缺货商品', () => {
    expect(() => addToCart(cart, 'C', 1)).toThrow('库存不足')
    expect(cart.items).toEqual([])
  })
  it('拒绝不存在的商品', () => {
    expect(() => addToCart(cart, 'X', 1)).toThrow('商品不存在')
  })
  it.each([0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1])(
    '拒绝非法数量 %s 且不改变状态', quantity => {
      const before = structuredClone(cart)
      expect(() => addToCart(cart, 'A', quantity)).toThrow('正整数')
      expect(cart).toEqual(before)
    }
  )
})

describe('updateQuantity / 修改数量', () => {
  it('重复添加和修改数量时同步维护 totalPrice', () => {
    addToCart(cart, 'A', 1)
    addToCart(cart, 'A', 2)
    expect(cart.items[0]).toEqual({ productId: 'A', quantity: 3, totalPrice: 3.60 })
    updateQuantity(cart, 'A', 2)
    expect(cart.items[0]).toEqual({ productId: 'A', quantity: 2, totalPrice: 2.40 })
  })
  it('替换数量而不是增加数量', () => {
    addToCart(cart, 'A', 2)
    updateQuantity(cart, 'A', 1)
    expect(cart.items[0].quantity).toBe(1)
    expect(listProducts(cart)[0].available).toBe(2)
  })
  it('允许修改到库存上限', () => {
    addToCart(cart, 'A', 1)
    updateQuantity(cart, 'A', 3)
    expect(cart.items[0].quantity).toBe(3)
  })
  it('修改超过库存时保留原数量', () => {
    addToCart(cart, 'A', 1)
    expect(() => updateQuantity(cart, 'A', 4)).toThrow('库存不足')
    expect(cart.items[0].quantity).toBe(1)
  })
  it('拒绝购物车中没有的商品', () => {
    expect(() => updateQuantity(cart, 'A', 1)).toThrow('购物车中没有')
  })
  it('拒绝不存在的商品编号', () => {
    expect(() => updateQuantity(cart, 'X', 1)).toThrow('商品不存在')
  })
  it.each([0, -1, 1.5])('拒绝目标数量 %s', quantity => {
    addToCart(cart, 'A', 1)
    expect(() => updateQuantity(cart, 'A', quantity)).toThrow('正整数')
    expect(cart.items[0].quantity).toBe(1)
  })
})

describe('金额约定', () => {
  it.each([-1, 1.234, Infinity, NaN, '1', Number.MAX_SAFE_INTEGER])('拒绝不合法价格 %s', price => {
    expect(() => toCents(price)).toThrow('价格必须')
  })
  it('处理两位小数的浮点表示，允许零价格', () => {
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0)).toBe(0)
  })
})

describe('removeFromCart / clearCart / 删除与清空', () => {
  it('删除一行，保留其他商品，释放可添加数量', () => {
    addToCart(cart, 'A', 2)
    addToCart(cart, 'B', 1)
    removeFromCart(cart, 'A')
    expect(cart.items).toEqual([{ productId: 'B', quantity: 1, totalPrice: 2.50 }])
    expect(listProducts(cart)[0].available).toBe(3)
  })
  it('删除不存在的行时报告错误', () => {
    expect(() => removeFromCart(cart, 'A')).toThrow('购物车中没有')
  })
  it('清空所有商品，但不扣库存', () => {
    addToCart(cart, 'A', 2)
    addToCart(cart, 'B', 1)
    clearCart(cart)
    expect(cart.items).toEqual([])
    expect(listProducts(cart).map(p => p.available)).toEqual([3, 2, 0])
  })
  it('可以重复清空空购物车', () => {
    clearCart(cart)
    clearCart(cart)
    expect(cart.items).toEqual([])
  })
})

describe('getCartSummary / 金额计算', () => {
  it('按单价乘数量计算小计，再累加总价和总件数', () => {
    addToCart(cart, 'A', 2)
    addToCart(cart, 'B', 1)
    expect(getCartSummary(cart)).toEqual({
      items: [
        { productId: 'A', name: '苹果', price: 1.2, quantity: 2, totalPrice: 2.40 },
        { productId: 'B', name: '面包', price: 2.5, quantity: 1, totalPrice: 2.50 }
      ],
      totalQuantity: 3,
      totalCents: 490
    })
  })
  it('用整数分计算 0.10 元加 0.20 元', () => {
    const small = createCart([
      { id: 'A', name: 'A', price: 0.1, quantityAvailable: 1, description: 'test product' },
      { id: 'B', name: 'B', price: 0.2, quantityAvailable: 1, description: 'test product' }
    ])
    addToCart(small, 'A', 1)
    addToCart(small, 'B', 1)
    expect(getCartSummary(small).totalCents).toBe(30)
  })
  it('修改返回的摘要或商品列表不会修改购物车', () => {
    addToCart(cart, 'A', 1)
    const summary = getCartSummary(cart)
    summary.items[0].quantity = 999
    const listed = listProducts(cart)
    listed[0].quantityAvailable = 999
    expect(cart.items[0].quantity).toBe(1)
    expect(cart.products[0].quantityAvailable).toBe(3)
  })
  it('拒绝超出安全整数范围的总金额', () => {
    const big = createCart([
      { id: 'A', name: 'A', price: 50000000000000, quantityAvailable: 1, description: 'test product' },
      { id: 'B', name: 'B', price: 50000000000000, quantityAvailable: 1, description: 'test product' }
    ])
    addToCart(big, 'A', 1)
    addToCart(big, 'B', 1)
    expect(() => getCartSummary(big)).toThrow('安全范围')
  })
})

describe('checkout / 结账', () => {
  it('返回收据、扣减对应库存、清空购物车', () => {
    addToCart(cart, 'A', 2)
    addToCart(cart, 'B', 1)
    const receipt = checkout(cart)
    expect(receipt.totalCents).toBe(490)
    expect(receipt.totalQuantity).toBe(3)
    expect(receipt.items).toHaveLength(2)
    expect(cart.products.map(p => p.quantityAvailable)).toEqual([1, 1, 0])
    expect(cart.items).toEqual([])
    expect(listProducts(cart).map(p => p.available)).toEqual([1, 1, 0])
  })
  it('空车或重复结账不能扣库存', () => {
    const before = structuredClone(cart)
    expect(() => checkout(cart)).toThrow('购物车为空')
    expect(cart).toEqual(before)
  })
  it('结账后继续购物使用新的库存', () => {
    addToCart(cart, 'A', 2)
    checkout(cart)
    expect(() => addToCart(cart, 'A', 2)).toThrow('库存不足')
    addToCart(cart, 'A', 1)
    checkout(cart)
    expect(cart.products[0].quantityAvailable).toBe(0)
    expect(() => checkout(cart)).toThrow('购物车为空')
  })
  it('后面的商品库存失效时，前面的商品也不扣库存', () => {
    addToCart(cart, 'A', 2)
    addToCart(cart, 'B', 2)
    cart.products[1].quantityAvailable = 1 // 模拟结账前库存发生变化
    const before = structuredClone(cart)
    expect(() => checkout(cart)).toThrow('库存不足')
    expect(cart).toEqual(before)
  })
})
