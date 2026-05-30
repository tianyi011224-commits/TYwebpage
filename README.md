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
