# 琴习导入解析后端

当前后端使用 Supabase Edge Function：`analyze-import`。

## 这个后端能做什么

- 接收小红书链接、标题、文稿/字幕/笔记、图片截图。
- 有 `OPENAI_API_KEY` 时，用 AI 解析图片和文字，生成：
  - 乐理知识点
  - 练琴建议
  - 琴谱草稿说明
  - 可进入“学习”页反复练的题目
- 没有 `OPENAI_API_KEY` 时，用内置规则兜底解析。

## 这个后端暂时不能做什么

- 不能绕过小红书登录读取视频。
- 不能抓取私有内容、破解反爬、复用用户 Cookie。
- 不能自动保存或传播没有授权的版权内容。

如果小红书以后提供官方 OAuth 和内容 API，可以在 `tryOfficialXiaohongshuImport` 里接入。现在代码只预留了配置位，不做非官方抓取。

## 部署步骤

先安装 Supabase CLI：

```bash
brew install supabase/tap/supabase
```

登录并关联项目：

```bash
supabase login
supabase link --project-ref rwrqumnbgxcqonpvfxqj
```

配置 AI 解析 key：

```bash
supabase secrets set OPENAI_API_KEY=你的_OpenAI_API_Key
supabase secrets set OPENAI_IMPORT_MODEL=gpt-4.1-mini
```

部署函数：

```bash
supabase functions deploy analyze-import
```

部署后，琴习前端会自动调用：

```text
https://rwrqumnbgxcqonpvfxqj.supabase.co/functions/v1/analyze-import
```

如果函数不可用，前端会自动降级到本地规则解析。

## 将来接小红书官方授权时

如果拿到了小红书官方开放平台的 OAuth 和内容读取能力，再配置：

```bash
supabase secrets set XHS_CLIENT_ID=官方_client_id
supabase secrets set XHS_CLIENT_SECRET=官方_client_secret
supabase secrets set XHS_CONTENT_API_BASE=官方内容API地址
```

然后在 `supabase/functions/analyze-import/index.ts` 的 `tryOfficialXiaohongshuImport` 中按官方文档实现授权内容读取。

注意：不要在这里加入 Cookie 抓取、私有接口、反爬绕过逻辑。
