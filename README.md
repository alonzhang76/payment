# 常州收支表 - 收支管理系统

一个基于Web的收支管理系统，用于多公司财务追踪。

## 功能特性

- 多公司财务数据管理
- 收入支出分类统计
- 图表可视化展示
- 数据导入导出功能
- NAS服务器数据同步

## 技术栈

- HTML5
- Tailwind CSS v3
- JavaScript (ES6+)
- Chart.js
- SheetJS (Excel处理)

## 部署方式

### 方法一：本地部署

1. 克隆或下载项目文件到本地
2. 启动本地代理服务器：
   ```bash
   node proxy.js
   ```
3. 在浏览器中打开 `index.html` 文件

### 方法二：GitHub Pages部署

1. 将项目推送到GitHub仓库
2. 启用GitHub Pages：
   - 进入仓库设置
   - 找到"Pages"选项
   - 选择"gh-pages"分支作为发布源
   - 保存设置
3. 系统会自动部署，部署完成后可通过 `https://<username>.github.io/<repository-name>` 访问

## 配置说明

### 代理服务器配置

`proxy.js` 文件包含了代理服务器的配置，主要用于处理跨域请求和认证：

- `NAS_HOST`: NAS服务器IP地址
- `NAS_PORT`: NAS服务器端口
- `PROXY_PORT`: 代理服务器端口

### 环境适配

系统会自动检测当前环境，适配不同的部署方式：

- 本地环境：使用本地代理服务器访问NAS数据
- GitHub Pages环境：直接访问NAS服务器（需要NAS服务器配置CORS）

## 使用说明

1. 打开应用后，系统会显示登录模态框
2. 输入NAS服务器的用户名和密码
3. 点击"登录并加载"按钮，系统会从NAS服务器加载数据
4. 也可以选择"仅使用本地数据"，跳过NAS登录
5. 进入主界面后，可以：
   - 查看财务概览
   - 添加新交易
   - 查看和筛选交易记录
   - 查看图表统计
   - 导入导出数据

## 数据同步

系统支持从NAS服务器同步数据，需要：

1. NAS服务器上有JSON格式的备份文件
2. 备份文件位于 `DataBackup` 目录下
3. 文件名格式为 `收支表备份_YYYY-MM-DD.json`

## 注意事项

1. GitHub Pages部署时，NAS服务器需要配置CORS，允许跨域访问
2. 本地开发时，需要启动代理服务器
3. 首次使用时，建议先备份现有数据
4. 定期从NAS服务器同步数据，确保数据安全

## 开发说明

### 项目结构

```
├── index.html          # 主页面
├── proxy.js           # 本地代理服务器
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions部署配置
└── README.md          # 项目说明文档
```

### 主要功能模块

- 登录验证模块
- 数据加载与同步模块
- 交易管理模块
- 图表统计模块
- 数据导入导出模块

## 浏览器兼容

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT License

## 更新日志

- v1.0.0: 初始版本
  - 多公司财务数据管理
  - 收入支出分类统计
  - 图表可视化展示
  - 数据导入导出功能
  - NAS服务器数据同步

## 贡献

欢迎提交Issue和Pull Request！

## 联系作者

Designed By AlonZhang