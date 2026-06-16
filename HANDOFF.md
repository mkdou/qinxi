# 琴习 App 交接文档

更新日期：2026-06-16

## 项目路径

```text
/Users/liuxiaoyan/Documents/Codex/2026-06-13/app
```

线上仓库：

```text
git@github.com:mkdou/qinxi.git
https://github.com/mkdou/qinxi
```

线上访问地址：

```text
https://mkdou.github.io/qinxi/
```

## 技术栈

- 前端：原生 HTML、CSS、JavaScript，无构建工具。
- 存储：浏览器 `localStorage`，统一数据键为 `qinxi_app_data_v2`。
- PWA：`manifest.webmanifest`、`sw.js`、`assets/*` 图标，支持 iPhone 添加到主屏幕。
- 云同步：Supabase Auth 邮箱 OTP + Supabase 表 `public.qinxi_user_data`。
- 后端解析：Supabase Edge Function `analyze-import`，代码在 `supabase/functions/analyze-import/index.ts`。
- AI 解析：预留 OpenAI Responses API，需要在 Supabase secrets 配置 `OPENAI_API_KEY`。
- 部署：GitHub Pages 托管静态前端；Supabase 单独部署数据库、Auth、Edge Function。

## 启动和部署命令

### 本地打开

最简单方式：

```bash
open index.html
```

也可以用任意静态服务器打开项目目录。

### 前端语法检查

当前机器没有系统级 `node/npm/npx`，Codex 使用过内置 Node 路径检查：

```bash
/Users/liuxiaoyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check script.js
/Users/liuxiaoyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check sw.js
```

### 推送发布

```bash
git add .
git commit -m "message"
GIT_SSH_COMMAND='ssh -i /Users/liuxiaoyan/.ssh/id_ed25519_mkdou_qinxi -o IdentitiesOnly=yes' git push
```

GitHub Pages 会从 `main` 分支根目录发布。

### Supabase 数据表

在 Supabase SQL Editor 执行：

```text
SUPABASE_SETUP.sql
```

### Supabase Edge Function

详见：

```text
BACKEND_IMPORT_SETUP.md
```

如果本机没有 Homebrew，也没有 Node/npm，先安装 Node.js 20 LTS；之后可用：

```bash
npx supabase login
npx supabase link --project-ref rwrqumnbgxcqonpvfxqj
npx supabase secrets set OPENAI_API_KEY=你的_OpenAI_API_Key
npx supabase secrets set OPENAI_IMPORT_MODEL=gpt-4.1-mini
npx supabase functions deploy analyze-import
```

## 已完成功能

### 基础 App

- 五个主 Tab：`首页`、`学习`、`乐谱`、`导入`、`打卡`。
- 响应式布局，手机底部导航，PC 顶部导航。
- PWA 图标和缓存已配置，当前缓存版本为 `qinxi-v15`。
- Logo 已改为钢琴图标，不再使用“琴”字。

### 打卡和学习记录

- 手动打卡记录钢琴学习：日期、分钟、练习内容、感受、备注。
- APP 课时练习自动计时，记录为 `APP学习`。
- 首页展示连续打卡、本周练习、累计练习、今日推荐和今日状态。
- 记录页展示打卡天数、平均时长、最近练习和历史记录。

### 云同步

- Supabase 邮箱 OTP 登录。
- 支持 6-8 位验证码。
- 登录后同步打卡日志、学习进度、做题统计、导入素材。
- 自动同步：
  - 本地数据变更后自动上传。
  - 登录后每 30 秒自动拉取合并。
  - 页面回到前台时自动拉取合并。
- 做题统计按设备保存后合并，避免手机和电脑互相覆盖。
- 支持退出登录，本地数据保留。

### 学习页

- 关卡式学习，当前核心关卡包括：
  - Natural Notes / 识别自然音在钢琴上的位置
  - Black Keys / 识别黑键升降音
  - Staff Notes / 识别五线谱上的音
  - Ledger Lines / 上加线和下加线
  - Half / Whole / 半音和全音
  - Clefs / 高音谱号和低音谱号
  - Rhythm / 节拍和拍号
  - Durations / 音符时值
  - Chords / 音阶和三和弦
- 前三类主要是键盘/五线谱可视化交互题。
- 第 4 课后已改为连续小测形式，不再是单题静态测验。
- 高音谱号和低音谱号做题统计已拆开：
  - `staff-note-treble`
  - `staff-note-bass`
  - `staff-ledger-treble`
  - `staff-ledger-bass`
- 五线谱题目答题前不再暴露正确答案；答错后才显示正确答案。
- 每个课时支持“重置本课”，全局也支持“全清”学习进度。
- 课时详情中“目录/先记住”已收进可展开区，优先展示练习器。

### 乐谱页

- 按分类展示曲目：古典入门、儿歌民谣、流行、电子、摇滚/金属。
- 内置示例包括《欢乐颂》《小星星》《致爱丽丝》片段和通用和弦/节奏模板。
- 五线谱视图支持把简谱数字标到五线谱音符上。
- 支持模式切换：对照、五线谱、简谱。
- 现代版权曲目只作为目标曲或授权导入提示，不内置完整版权谱。

### 导入页

- 可保存小红书链接、标题、文稿/字幕/笔记、截图/图片素材。
- 前端优先调用 Supabase Edge Function `analyze-import`。
- 后端不可用时自动降级为本地规则解析。
- 导入内容会生成“导入”分组的学习关卡和小测题。
- 图片小于约 700KB 时会保存预览；大图只记录文件名，避免撑爆 localStorage。
- 小红书官方授权读取已预留接口，但未实现非官方抓取。

## 未完成问题和风险

### 内容深度仍不足

- 课时内容还只是入门骨架，不够系统。
- 用户明确希望补充更全面的钢琴知识，例如音符时值关系、节奏、音阶、调号、和弦进行、左右手练法等。
- “钢琴知识路线”已从简单速查改为路线，但仍需要继续拆成交互课。

### 导入解析还未真正部署验收

- `analyze-import` Edge Function 已写入仓库，但本机没有 `deno` / `supabase` CLI，未本地启动验证。
- 需要在 Supabase 部署函数并配置 `OPENAI_API_KEY` 后测试。
- 目前前端会 fallback 到本地解析，所以即使函数 404/未部署，App 仍能保存素材。

### 小红书授权不确定

- 暂未找到可给普通用户 OAuth 后读取任意笔记正文/图片/视频的公开官方 API。
- 当前代码只预留官方 OAuth/内容 API 配置：
  - `XHS_CLIENT_ID`
  - `XHS_CLIENT_SECRET`
  - `XHS_CONTENT_API_BASE`
- 不应加入 Cookie 抓取、私有接口、反爬绕过逻辑。

### PWA 缓存

- 每次改前端或图标，需要更新 `sw.js` 的 `cacheName`。
- 手机主屏幕 App 可能需要重开或刷新，甚至删除后重新添加，才能看到图标更新。

### 音频真实度

- 当前钢琴声使用 Web Audio 合成音，不是真实采样。
- 后续如果追求真实钢琴声音，需要引入采样音源或更好的合成器。

## 重要文件

```text
index.html
```

页面结构、Tab、表单、PWA meta。

```text
styles.css
```

整体视觉、响应式布局、练习器、乐谱、导入卡片样式。

```text
script.js
```

核心业务逻辑：

- 数据迁移和 localStorage
- Supabase 登录/同步
- 学习关卡和做题统计
- 键盘/五线谱/小测渲染
- 乐谱渲染
- 导入解析和生成训练

```text
sw.js
```

Service Worker 缓存。当前版本：`qinxi-v15`。

```text
manifest.webmanifest
```

PWA 名称、图标、启动配置。

```text
assets/icon.svg
assets/icon-192.png
assets/icon-512.png
assets/apple-touch-icon.png
```

App 图标。已去掉“琴”字，使用钢琴键图标。

```text
SUPABASE_SETUP.sql
SUPABASE_SETUP.md
```

云同步数据库表和 RLS 策略说明。

```text
supabase/functions/analyze-import/index.ts
```

导入解析 Edge Function。

```text
BACKEND_IMPORT_SETUP.md
```

导入解析后端部署说明。

```text
README.md
INSTALL.md
```

项目说明和安装/发布说明。

## 最近改动

最近提交：

```text
7789892 Split clef practice stats
702934d Fix bass clef note mapping
a06a1f7 Replace text logo and clarify backend setup
da24e55 Add import analysis backend scaffold
62fab38 Refine lesson cards and import workflow
72c2093 Improve learning sync and imported drills
c29f957 Support 8 digit OTP codes
2400905 Add email OTP login
```

重点说明：

- 修复低音谱号映射：
  - 第 1 线 `G2`
  - 第 2 线 `B2`
  - 第 3 线 `D3`
  - 第 4 线 `F3`
  - 第 5 线 `A3`
  - 下加一线 `E2`
  - 上加一线 `C4`
- 高音谱号/低音谱号统计拆分。
- 移除练习题下方提前暴露答案的提示。
- Logo 改为钢琴图标，并重新生成 PWA PNG 图标。
- 添加后端导入解析脚手架和部署文档。

## 下一步建议

1. 部署并验收 `analyze-import` Edge Function。
   - 安装 Node.js 20 LTS。
   - 用 `npx supabase ...` 部署函数。
   - 配置 `OPENAI_API_KEY`。
   - 在手机端导入一张乐理截图，确认能生成训练关卡。

2. 扩充学习内容。
   - 优先补“音符时值关系”：全音符、二分音符、四分音符、八分音符、附点、休止符。
   - 每个知识点都应变成可循环练习，而不是只放说明文字。
   - 继续补音阶、调号、和弦、左右手协调、节拍器训练。

3. 改进练习器。
   - 五线谱练习加入更多音域和逐级难度。
   - 真实钢琴音色改为采样。
   - 错题本：记录经常错的音，并优先复习。

4. 强化导入。
   - 支持截图 OCR / AI 视觉解析。
   - 支持把解析出的知识点人工编辑后再生成课时。
   - 如果未来拿到小红书官方开放 API，再接官方 OAuth 内容读取。

5. 优化数据同步。
   - 增加同步状态详情，例如最近同步时间、失败原因。
   - 增加云端数据导出/备份入口。
   - 重置功能可以进一步细分为“只重置统计，不重置已掌握状态”。

6. 做基础测试。
   - 当前是纯前端手工验证，缺少自动化测试。
   - 可先补一组数据合并、做题统计、低音谱号映射的单元测试。
