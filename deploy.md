# 🚀 部署指南

本文档提供了将NYKD BOSS刷新时间表PWA部署到各种在线平台的详细步骤。

## 📋 部署前准备

确保你的项目包含以下文件：
- `index.html` - 主页面
- `app.js` - 应用逻辑
- `manifest.json` - PWA清单
- `sw.js` - Service Worker
- `icon-192.png` - 应用图标
- `icon-512.png` - 应用图标
- `README.md` - 说明文档

## 🌟 推荐平台：GitHub Pages（免费）

### 步骤1：创建GitHub仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角的 "+" → "New repository"
3. 仓库名称：`nykd-boss-refresh`
4. 设置为 Public（公开）
5. 勾选 "Add a README file"
6. 点击 "Create repository"

### 步骤2：上传项目文件

**方法A：使用GitHub网页界面**
1. 在仓库页面点击 "uploading an existing file"
2. 拖拽所有项目文件到页面
3. 填写提交信息："Initial commit - PWA ready"
4. 点击 "Commit changes"

**方法B：使用Git命令行**
```bash
# 在项目目录执行
git init
git add .
git commit -m "Initial commit - PWA ready"
git branch -M main
git remote add origin https://github.com/你的用户名/nykd-boss-refresh.git
git push -u origin main
```

### 步骤3：启用GitHub Pages

1. 进入仓库的 "Settings" 页面
2. 滚动到 "Pages" 部分
3. Source 选择 "Deploy from a branch"
4. Branch 选择 "main"
5. Folder 选择 "/ (root)"
6. 点击 "Save"

### 步骤4：访问你的应用

- 等待1-2分钟部署完成
- 访问地址：`https://你的用户名.github.io/nykd-boss-refresh`
- 在手机上打开此地址即可安装PWA

## 🚀 其他部署平台

### Netlify（推荐，免费）

1. 访问 [Netlify](https://netlify.com)
2. 注册并登录
3. 点击 "New site from Git"
4. 连接GitHub并选择你的仓库
5. 部署设置保持默认
6. 点击 "Deploy site"
7. 获得类似 `https://amazing-name-123456.netlify.app` 的地址

**优势：**
- 自动部署（推送代码即更新）
- 自定义域名
- HTTPS 自动配置
- 表单处理功能

### Vercel（快速，免费）

1. 访问 [Vercel](https://vercel.com)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 导入你的GitHub仓库
5. 保持默认设置，点击 "Deploy"
6. 获得类似 `https://nykd-boss-refresh.vercel.app` 的地址

**优势：**
- 极快的部署速度
- 全球CDN加速
- 自动HTTPS
- 无服务器函数支持

### Firebase Hosting（Google，免费）

1. 安装Firebase CLI：`npm install -g firebase-tools`
2. 登录：`firebase login`
3. 在项目目录初始化：`firebase init hosting`
4. 选择现有项目或创建新项目
5. 设置public目录为当前目录 `.`
6. 配置为单页应用：选择 "No"
7. 部署：`firebase deploy`

**优势：**
- Google基础设施
- 高可用性
- 详细的分析数据
- 与其他Google服务集成

## 📱 PWA部署注意事项

### HTTPS要求
- 所有推荐平台都自动提供HTTPS
- PWA功能需要HTTPS才能正常工作
- Service Worker只在HTTPS下运行

### 缓存策略
- Service Worker会缓存所有资源
- 更新应用时用户会收到提示
- 可以通过浏览器开发者工具清除缓存

### 测试清单
部署后请测试以下功能：
- [ ] 页面正常加载
- [ ] PWA安装提示出现
- [ ] 安装后可离线访问
- [ ] 日历导出功能正常
- [ ] 通知权限请求正常
- [ ] 响应式设计在移动端正常

## 🔧 自定义域名（可选）

### GitHub Pages
1. 在仓库根目录创建 `CNAME` 文件
2. 文件内容为你的域名：`boss.yourdomain.com`
3. 在域名DNS设置中添加CNAME记录指向 `你的用户名.github.io`

### Netlify/Vercel
1. 在平台控制面板中找到域名设置
2. 添加自定义域名
3. 按照提示配置DNS记录

## 🛠️ 故障排除

### 常见问题

**PWA安装按钮不出现**
- 检查manifest.json是否正确加载
- 确认Service Worker注册成功
- 验证HTTPS连接

**Service Worker更新问题**
- 清除浏览器缓存
- 检查sw.js文件是否正确部署
- 在开发者工具中手动更新Service Worker

**图标不显示**
- 确认图标文件路径正确
- 检查图标文件是否成功上传
- 验证manifest.json中的图标配置

### 调试工具
- Chrome DevTools → Application → Service Workers
- Chrome DevTools → Application → Manifest
- Chrome DevTools → Lighthouse（PWA审核）

## 📞 技术支持

如果遇到部署问题：
1. 检查浏览器控制台错误
2. 验证所有文件都已正确上传
3. 确认平台部署状态
4. 查看平台的部署日志

---

**选择任一平台，几分钟内就能让全世界的玩家使用你的BOSS时间表！** 🎮