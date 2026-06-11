# QQ三国日常助手

> 一款基于 **Wails (Vue 3 + Go)** 的 QQ三国 桌面端工具，集合数值查询、成本计算、模拟器与日常清单等能力。  
> 立项动机：市面上小程序虽多，但广告频繁，因此自己写一个无广告的桌面工具，顺带练练前端。  
> **正在积极开发中，欢迎 PR！**

<p align="center">
  <img src="https://hl1998-1255562705.cos.ap-shanghai.myqcloud.com/Img/d46836b16b7eef8145da59f53f6f3c43.png" width="520" height="520"/>
  <img src="https://hl1998-1255562705.cos.ap-shanghai.myqcloud.com/Img/f0a2528b7ea6b789f25f510cdfff8730.png" width="520"height="520" />
</p>



---

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | [Wails v2](https://wails.io/) |
| 后端 | Go |
| 前端 | Vue 3 · TypeScript · Vite · vue-router · animal-island-vue |
---

## 🚀 快速开始

```bash
# 1. 安装 Wails CLI（一次性）
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 2. 拉取依赖
cd frontend && npm install && cd ..

# 3. 开发模式（热重载，前端 http://localhost:34115）
wails dev

# 4. 生产打包
wails build              # 普通可执行文件
wails build -nsis        # 生成 Windows 安装包
```

## 📁 项目结构

```
qqsg-toolbox/
├── backend/             Go 后端
│   ├── entity/          实体定义
│   ├── repo/            数据读写
│   ├── service/         业务逻辑
│   ├── logic/           计算 / 算法
│   └── app.go           Wails 暴露接口
├── frontend/
│   └── src/
│       ├── views/       页面
│       ├── components/  通用组件
│       ├── router/      路由
│       └── assets/      静态资源
├── data/                内置数据
│   ├── soul/
│   └── imtimate/
├── build/               打包配置
│   ├── windows/         icon.ico / installer/project.nsi
│   └── darwin/          Info.plist
├── main.go              Wails 入口
├── wails.json           Wails 配置
└── go.mod / go.sum
```

---

## 🤝 贡献

1. Fork 本仓库 → 新建分支（`feat/xxx` 或 `fix/xxx`）
2. 提交前请确保：
   - 前端 `npm run build` 通过且 lint 无新增警告
   - Go 端 `go vet ./...` 通过
3. 提交 PR 时附上：功能截图（如涉及 UI）、改动说明、影响范围

---

## 📄 许可与免责

- 本工具与腾讯及《QQ三国》官方无任何关联，仅为玩家自用工具。
- 数据来源于游戏内公开数值与社区整理，不保证 100% 准确。
- 不收集任何账号信息，所有数据均存储于本地。
