# Supabase 云同步设置

## 1. 创建数据表

进入 Supabase 项目后，打开 `SQL Editor`，粘贴并运行 `SUPABASE_SETUP.sql` 里的全部 SQL。

这会创建一张 `qinxi_user_data` 表，用于保存每个登录用户自己的琴习数据。

## 2. 设置登录跳转地址

进入 `Authentication -> URL Configuration`：

- `Site URL` 填：`https://mkdou.github.io/qinxi/`
- `Redirect URLs` 增加：`https://mkdou.github.io/qinxi/`

## 3. 使用方式

回到琴习首页，在“云同步”里输入邮箱。邮件会包含数字验证码，把验证码输入琴习即可登录同步。

如果邮件里没有显示验证码，进入 `Authentication -> Emails -> Magic link or OTP`，把邮件正文里加入：

```text
验证码：{{ .Token }}
```
