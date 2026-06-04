# TIAN YI INTERNATIONAL TRADING PTE. LTD 购物网站

这是 TIAN YI INTERNATIONAL TRADING PTE. LTD 的购物网站，支持手机和电脑访问。顾客可以浏览商品、加入购物车、填写联系方式并提交订单意向。

网站包含公司介绍、商品分类、购物车和 Netlify 表单收单功能。

## 本地运行

```bash
npm install
npm run dev
```

运行后电脑打开终端显示的本地地址即可访问。手机和电脑连接同一个 Wi-Fi 时，也可以用终端显示的 Network 地址在手机浏览器打开。

## 公开给所有人访问

项目已经包含 `netlify.toml` 和 Netlify 表单配置，适合直接部署到 Netlify：

1. 把本项目上传到 GitHub。
2. 在 Netlify 新建站点，选择该 GitHub 仓库。
3. Build command 使用 `npm run build`。
4. Publish directory 使用 `dist`。
5. 部署完成后，任何人都可以通过 Netlify 提供的网址在手机或电脑访问并提交购物订单。

订单会进入 Netlify 的 Forms 面板，表单名称是 `fresh-order`。

## 订单邮件通知

TIAN YI 的订单收件邮箱：`tianyi011224@gmail.com`

在 Netlify 后台设置自动邮件通知：

1. 进入网站项目。
2. 打开 `Project configuration`。
3. 进入 `Notifications`。
4. 找到 `Emails and webhooks`。
5. 在 `Form submission notifications` 里点击 `Add notification`。
6. 选择 `Email notification`。
7. Form 选择 `fresh-order`，Email 填写 `tianyi011224@gmail.com`。
8. 保存后，客户提交订单时 Netlify 会自动把订单发送到该邮箱。

网站表单已经包含 `subject` 字段，邮件标题会显示为 `TIAN YI INTERNATIONAL TRADING PTE. LTD 新订单`。

## 后端订单自动化

项目已经加入 Netlify Functions 后端接口：

- 接口地址：`/api/orders`
- 函数文件：`netlify/functions/create-order.mjs`
- 自动生成订单编号，例如 `TY-20260604-12345`
- 自动生成配货单 HTML
- 自动生成 Invoice HTML
- 自动把订单编号、配货单、Invoice 和邮件状态写入 Netlify Forms

邮件发送使用 Resend API。要让订单真正自动发到 TIAN YI 邮箱，需要在 Netlify 项目里配置环境变量：

```text
RESEND_API_KEY=你的 Resend API Key
ORDER_EMAIL_TO=tianyi011224@gmail.com
ORDER_EMAIL_FROM=你在 Resend 验证过的发件邮箱
```

如果暂时没有配置 `RESEND_API_KEY`，网站仍然可以提交订单，也会生成订单编号、配货单和 Invoice，并保存到 Netlify Forms；只是不会自动发送邮件。
