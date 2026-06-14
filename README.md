# 琴习

零基础钢琴学习打卡应用，支持手机和电脑浏览器使用。

## 现在能做什么

- 每日打卡，记录钢琴学习内容、时长和感受。
- APP 课时练习自动计时，和手动钢琴练习分开记录。
- 互动识谱练习，包含钢琴键、五线谱、黑键音名和答题正确率。
- 乐谱、导入素材和学习记录都保存在当前浏览器本地。
- 可接入 Supabase 云同步，让电脑和手机共用打卡、进度和做题记录。
- 可部署 Supabase Edge Function 解析导入素材，把文稿/截图整理成学习训练。
- 支持作为 PWA 添加到 iPhone 主屏幕。

## 后端导入解析

见 [BACKEND_IMPORT_SETUP.md](./BACKEND_IMPORT_SETUP.md)。当前支持文稿、笔记和截图解析；小红书官方授权读取已预留接口，但不会做 Cookie 抓取或反爬绕过。

## 本地打开

直接用浏览器打开 `index.html` 即可。

## 发布到 GitHub Pages

1. 在 GitHub 创建一个空仓库，例如 `qinxi`。
2. 把本项目推送到仓库。
3. 进入 GitHub 仓库的 `Settings -> Pages`。
4. `Build and deployment` 选择 `Deploy from a branch`。
5. 分支选择 `main`，目录选择 `/root`。

发布完成后，iPhone 用 Safari 打开 GitHub Pages 地址，点分享按钮，再选择“添加到主屏幕”。
