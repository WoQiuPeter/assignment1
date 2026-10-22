# 作业 1：Node.js 命令行购物车

基于 [BTH012 课程模板](https://github.com/pobengtsson/bth012-a1-part-a)，原模板作者为 Per-Olof Bengtsson。现已按完整购物车题目核对字段、循环与依赖限制。

个人公开仓库：[WoQiuPeter/assignment1](https://github.com/WoQiuPeter/assignment1)。已通过重新克隆验证、80 项测试、Windows/Linux 自动测试及云端 Docker 构建和购物流程检查，详见 [发布与测试结果](docs/发布与测试结果.md)。

## 运行

在本目录打开终端，需要 Node.js 24 或以上：

```text
npm ci
npm test
npm run lint
npm start
```

Windows PowerShell 若提示禁止加载 `npm.ps1`，改用 `npm.cmd ci`、`npm.cmd test`、`npm.cmd run lint` 和 `npm.cmd start`，无需修改系统策略。

示例输入：

```text
add P1 2
add P2 3
cart
checkout
```

结账显示 5 件、35.50 元，然后结束程序。每次其他操作后均重新显示商品选择界面。空车或其他结账错误不结束会话，可以修改后重试。

## 按题目定义的数据

```js
// 商品数组中的对象；price 单位为元。
{ id: 'P1', name: '笔记本', description: 'A5 方格笔记本', price: 12.5, quantityAvailable: 10 }
// 购物车数组中的对象；totalPrice 是该商品行的小计，单位为元。
{ productId: 'P1', quantity: 2, totalPrice: 25 }
```

`createCart()` 返回一个会话状态对象：`products` 是独立的商品数组，`items` 是题目要求的购物车数组。这样每个测试拥有自己的数据，不会修改默认目录。

商品显示完整描述、价格和可添加数量。添加时不扣 `quantityAvailable`，成功结账才扣减；可添加数量为 `quantityAvailable - 本车已有数量`。

## 命令

| 命令 | 作用 |
| --- | --- |
| `list` | 显示商品 |
| `add P1 2` | 输入 ID 和增加数量；重复添加合并同一行 |
| `cart` | 显示各行 totalPrice、总件数和总金额 |
| `checkout` | 计算总价、扣库存、返回收据并退出 CLI |
| `exit` | 不结账退出 |
| `help` | 帮助 |
| `set P1 3` | 附加功能：修改为目标数量，并更新 totalPrice |
| `remove P1` / `clear` | 附加功能：删除或清空，不扣库存 |

## 合理假设

- 字符串 ID 区分大小写；命令格式为 `add ID 数量`。
- 数量必须是正安全整数；不接受零、负数、小数或 `2abc`。
- 重复添加合并，并以累计数量检查库存。
- `price`、`totalPrice` 对外单位为元，价格最多两位小数；内部转成整数分计算后再转换回元。
- 金额总计由各行小计转换为分后累加；不含题目未规定的折扣、税费或运费。
- 单用户内存程序；成功结账退出，失败则继续；重启恢复初始数据。

这些假设已在代码注释及测试中体现。

## 测试与限制

`test/cart.test.js` 测试商品结构、添加、非法输入、累计库存、金额、结账和附加操作。`test/cli.test.js` 测试命令、readline 输入流、操作后返回商品界面、成功结账退出及真实启动入口。

只使用原模板的七个开发包；应用代码只使用标准 JavaScript、自有模块及 Node.js 内置模块。已移除此前额外加入的覆盖率包与相关命令，不再将旧覆盖率结果作为本版结果。

可运行 `node tools/validate.mjs` 记录真实检查输出，见 `docs/验证结果.txt` 与 `docs/示例运行结果.txt`。本工具仅使用 Node.js 内置模块。

## 提交材料

- `output/pdf/作业1-购物车设计说明__张能30202533453.pdf`：两页设计文档，只列测试意图和函数设计，不含 expect 断言。
- `docs/演示讲稿.md`：约 16 分钟的第一人称练习稿，需理解后本人实际录制。
- `docs/需求与验证.md`：六条功能和限制的核对表。
- `docs/提交清单.md`：GitHub、Docker、同行评审与 Canvas 步骤。

Python PDF 排版工具不属于应用程序，保留在项目外的本地工作目录，不参与运行或测试，也不随代码包提交。

## Docker

Dockerfile、Git origin 和项目元数据均已配置为 `https://github.com/WoQiuPeter/assignment1.git`，源码已推送。老师可以直接重新克隆并执行以下命令，无需填写占位路径。

```text
docker build --no-cache -t assignment1 .
docker run --rm -it assignment1
```

`Dockerfile.local` 用于验证本地副本。正式 Dockerfile 已在 GitHub 的 Ubuntu 环境完成构建与容器运行验证；这台 Windows 电脑尚未安装 Docker。真实同行评审、本人视频录制和 Canvas 上传仍需完成。

这是个人作业，请根据课程 AI 使用指南核实辅助方式并如实说明，确保能独立解释提交的代码。
