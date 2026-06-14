# 琴习安装说明

## iPhone 安装方式

当前项目是 PWA 网页应用。iPhone 不能安装 `file:///.../index.html` 这种电脑本地文件路径。

要在 iPhone 上像 App 一样使用，需要先把项目发布到 HTTPS 网站，然后：

1. 用 iPhone Safari 打开发布后的网址。
2. 点击底部分享按钮。
3. 选择“添加到主屏幕”。
4. 主屏幕会出现“琴习”图标。

## 最快发布方式

推荐先用 Netlify、Vercel 或 GitHub Pages 发布当前文件夹。

需要发布的文件包括：

- `index.html`
- `styles.css`
- `script.js`
- `manifest.webmanifest`
- `sw.js`
- `assets/`

发布后得到的 `https://...` 地址，就可以在 iPhone、iPad、Mac 和其他电脑上打开。

## 数据同步说明

现在数据仍然保存在当前设备浏览器里。即使安装到 iPhone 主屏幕，学习时长、做题记录、打卡记录也只在这台设备本地保存。

要实现手机和电脑同步，需要下一步接云端：

- 登录账号
- 云数据库
- 同步 `qinxi_app_data_v2`

当前数据结构已经升级为未来可同步的格式。
