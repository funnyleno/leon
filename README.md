![1761982834208](image/README/1761982834208.png)![1761982837956](image/README/1761982837956.png)# 竞赛电商 Demo 前端

这是一个加强版的静态前端 Demo，适合竞赛演示和原型展示。包含商品展示、详情弹窗、搜索/筛选/排序、购物车（本地持久化）与模拟结算。

## 文件说明
- `index.html` - 主页入口，可直接在浏览器打开。
- `styles.css` - 样式文件。
- `app.js` - 前端逻辑，包含示例商品数据、搜索/筛选、购物车与本地持久化。

## 本地打开（推荐两种方式）
1. 直接打开（简单）
   - 在文件管理器中双击 `index.html`。
   - 适合演示，但某些浏览器会限制本地 fetch（本项目未使用 fetch）。

2. 使用简单 HTTP 服务器（推荐）
   - 如果安装了 Python：在 PowerShell 中运行：

```powershell
cd "c:\Users\20679\Desktop\hle"
python -m http.server 8000
# 然后在浏览器打开 http://localhost:8000
```

### 快速生成可分享链接（临时）
如果你想快速把本地站点变成一个可分享的 URL（仅在你正在运行本地服务器时有效），可以使用 localtunnel：

```powershell
cd "c:\Users\20679\Desktop\hle"
python -m http.server 8000
npx localtunnel --port 8000
```

运行后会输出一个类似 `https://abcdef.loca.lt` 的 URL，复制该 URL 即可分享（隧道关闭后链接失效）。

## 说明与扩展建议
- 商品数据保存在 `app.js` 中，比赛时可替换为真实 API。
- 已实现：搜索、分类筛选、排序、购物车数量增减、删除、购物车在浏览器 localStorage 中持久化。

可继续扩展（我可以帮你实现）：
- 将项目改为 React/Vite 模板并接入 CI/CD 部署到 Vercel/Netlify/GitHub Pages；
- 添加用户登录、订单保存到后端和真实支付集成；
- 增加更多 UI 动画、无障碍支持和单元测试。