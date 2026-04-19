# feishu-blog-publisher

A new repository for publishing blog content through Feishu-related workflows.

## CloudBase 静态托管部署

CloudBase 的静态托管命令部署的是 `dist` 目录，因此部署前必须先构建：

```sh
npm run build
tcb hosting deploy ./dist /feishu-blog-publisher -e feishu-blog-publisher-d9f0c94566
```

如果在 CloudBase 控制台配置自定义部署命令，请使用：

```sh
npm run build && tcb hosting deploy ./dist /feishu-blog-publisher -e feishu-blog-publisher-d9f0c94566
```

注意：当前仓库里的 `api/feishu/event.js` 和 `api/feishu/card.js` 是 Node.js 接口代码，单独执行 `tcb hosting deploy` 只会部署静态文件，不会把这些接口发布成 CloudBase 云函数。

## Docker 镜像部署

仓库根目录包含 `Dockerfile`，可直接用于控制台里的默认 Docker 构建：

```sh
docker build -t feishu-blog-publisher .
docker run --rm -p 3000:3000 --env-file .env feishu-blog-publisher
```

容器会监听 `PORT` 环境变量，默认端口为 `3000`，并提供：

- `/`：构建后的静态页面。
- `/api/feishu/event`：飞书事件回调。
- `/api/feishu/card`：飞书卡片回调。
