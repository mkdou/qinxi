# Supabase 云同步设置

## 1. 创建数据表

进入 Supabase 项目后，打开 `SQL Editor`，粘贴并运行 `SUPABASE_SETUP.sql` 里的全部 SQL。

这会创建一张 `qinxi_user_data` 表，用于保存每个登录用户自己的琴习数据。

## 2. 设置登录跳转地址

进入 `Authentication -> URL Configuration`：

- `Site URL` 填：`https://mkdou.github.io/qinxi/`
- `Redirect URLs` 增加：`https://mkdou.github.io/qinxi/`

## 3. 使用方式

回到琴习首页，在“云同步”里输入邮箱。打开邮件里的登录链接后，电脑和手机用同一个邮箱登录即可同步。
