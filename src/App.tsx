import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Leaf,
  Lock,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Trash2,
  Truck,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import { categories, Product, ProductCategory, products } from "./products";

type CartLine = {
  product: Product;
  quantity: number;
};

type CartState = Record<string, number>;

type OrderApiResponse = {
  order: {
    orderNumber: string;
    orderTotal: number;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      price: number;
      subtotal: number;
    }>;
  };
  packingSlipPdfBase64: string;
  invoiceSpreadsheetBase64: string;
  packingSlipFilename: string;
  invoiceFilename: string;
  email?: {
    sent: boolean;
    reason?: string;
  };
};

type AdminOrderSummary = {
  orderNumber: string;
  createdAt: string;
  displayDate: string;
  customerName: string;
  contact: string;
  address: string;
  orderTotal: number;
  itemCount: number;
  status: string;
  statusLabel: string;
  emailSent: boolean;
  packingSlipFilename: string;
  invoiceFilename: string;
};

type AdminOrderRecord = {
  order: {
    order: {
      orderNumber: string;
      createdAt: string;
      customerName: string;
      contact: string;
      address: string;
      notes: string;
      orderTotal: number;
      items: Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        price: number;
        subtotal: number;
      }>;
    };
    status: string;
    packingSlipPdfBase64: string;
    invoiceSpreadsheetBase64: string;
    packingSlipFilename: string;
    invoiceFilename: string;
    email?: {
      sent: boolean;
      reason?: string;
    };
  };
};

const CART_STORAGE_KEY = "ty-shop-cart";
const ADMIN_PASSWORD_STORAGE_KEY = "ty-admin-password";
const LANGUAGE_STORAGE_KEY = "ty-site-language";
const ENABLE_ONLINE_SHOP = false;

type Language = "zh" | "en";

const orderStatuses = [
  { value: "pending", label: "待确认" },
  { value: "confirmed", label: "已确认" },
  { value: "packing", label: "配货中" },
  { value: "shipped", label: "已发货" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];
const ALL_CATEGORY = "全部";

const companyStats = [
  { value: "多渠道", label: "供应资源整合" },
  { value: "全流程", label: "询价、备货、配送跟进" },
  { value: "B2B+B2C", label: "企业与家庭订单兼顾" },
  { value: "可追踪", label: "订单确认与交付反馈" },
];

const companyProfileModules = [
  {
    slug: "company",
    icon: Store,
    title: { zh: "公司简介", en: "Company Profile" },
    summary: {
      zh: "用于展示公司基础信息，后续可补充正式介绍文字。",
      en: "Use this section for company background and basic business information.",
    },
    content: {
      zh: [
        "TIAN YI INTERNATIONAL TRADING PTE. LTD（添億公司）成立于2023年，是一家位于新加坡的综合型食品及厨房用品供应公司。公司专注于为本地餐饮企业及船运公司提供稳定、便捷、高效的一站式采购与配送服务。",
        "我们的主营业务包括新鲜水果、蔬菜、调味品、干货及各类厨房常用物品供应，主要服务于新加坡本地中国餐厅、中餐经营者及相关餐饮客户。凭借灵活的采购渠道和务实的服务方式，我们致力于帮助客户降低采购成本、提升后厨运营效率，并保障日常供应的稳定性。",
        "同时，TIAN YI INTERNATIONAL TRADING PTE. LTD 也为过往停靠新加坡港口的船舶提供船上伙食及食品物资供应服务。我们可根据船运公司和船员的实际需求，提供蔬果、主副食品、调料及厨房用品等配套供应，协助客户保障船上日常饮食与后勤需求。",
        "公司秉持“品质稳定、配送及时、服务用心、合作共赢”的经营理念，重视产品新鲜度、供货效率与客户长期合作关系。未来，我们将持续完善供应链与配送能力，为餐厅、船舶及各类企业客户提供更加专业、可靠的供应服务。",
      ],
      en: [
        "TIAN YI INTERNATIONAL TRADING PTE. LTD was established in 2023. Based in Singapore, the company is an integrated supplier of food products and kitchen essentials, focused on providing stable, convenient, and efficient one-stop procurement and delivery services for local food and beverage businesses and shipping companies.",
        "Our main business includes the supply of fresh fruits, vegetables, seasonings, dry goods, and a wide range of commonly used kitchen items. We mainly serve Chinese restaurants, Chinese food operators, and related F&B customers in Singapore. With flexible procurement channels and a practical service approach, we help customers reduce purchasing costs, improve kitchen operating efficiency, and maintain stable daily supply.",
        "TIAN YI INTERNATIONAL TRADING PTE. LTD also provides ship provision and food supply services for vessels calling at Singapore ports. Based on the actual needs of shipping companies and crew members, we can supply fruits and vegetables, staple and non-staple food products, condiments, and kitchen supplies to support daily onboard meals and logistics needs.",
        "Guided by the principles of stable quality, timely delivery, attentive service, and win-win cooperation, the company values product freshness, supply efficiency, and long-term customer relationships. Looking ahead, we will continue to improve our supply chain and delivery capabilities to provide more professional and reliable supply services for restaurants, vessels, and corporate customers.",
      ],
    },
    fields: [
      { zh: "成立时间", en: "Year Established" },
      { zh: "主营业务", en: "Main Business" },
      { zh: "服务城市/区域", en: "Service Cities / Areas" },
    ],
  },
  {
    slug: "product-range",
    icon: PackageCheck,
    title: { zh: "产品范围", en: "Product Range" },
    summary: {
      zh: "用于说明公司可供应的主要产品类别。",
      en: "Use this section to describe the main product categories available.",
    },
    fields: [
      { zh: "水果", en: "Fruits" },
      { zh: "蔬菜", en: "Vegetables" },
      { zh: "进口水果", en: "Imported Fruits" },
      { zh: "本地农产品", en: "Local Produce" },
      { zh: "有机产品", en: "Organic Products" },
      { zh: "预切/包装产品", en: "Pre-cut / Packaged Products" },
    ],
  },
  {
    slug: "advantages",
    icon: Truck,
    title: { zh: "服务优势", en: "Service Advantages" },
    summary: {
      zh: "用于突出供货、配送、价格与定制服务能力。",
      en: "Use this section to highlight supply, delivery, pricing, and custom order strengths.",
    },
    fields: [
      { zh: "稳定供货", en: "Stable Supply" },
      { zh: "每日配送", en: "Daily Delivery" },
      { zh: "冷链运输", en: "Cold Chain Transport" },
      { zh: "品质筛选", en: "Quality Selection" },
      { zh: "批发价格", en: "Wholesale Pricing" },
      { zh: "定制订单", en: "Custom Orders" },
    ],
  },
  {
    slug: "clients",
    icon: UsersRound,
    title: { zh: "合作客户", en: "Clients" },
    summary: {
      zh: "用于展示适合服务的客户类型。",
      en: "Use this section to show the customer groups the business serves.",
    },
    fields: [
      { zh: "餐厅", en: "Restaurants" },
      { zh: "酒店", en: "Hotels" },
      { zh: "超市", en: "Supermarkets" },
      { zh: "学校", en: "Schools" },
      { zh: "食堂", en: "Canteens" },
      { zh: "食品加工厂", en: "Food Processing Factories" },
    ],
  },
  {
    slug: "contact",
    icon: Globe2,
    title: { zh: "联系方式", en: "Contact" },
    summary: {
      zh: "用于集中展示客户询价和联系入口。",
      en: "Use this section for enquiry channels and contact details.",
    },
    fields: [
      { zh: "电话", en: "Phone" },
      { zh: "WhatsApp", en: "WhatsApp" },
      { zh: "邮箱", en: "Email" },
      { zh: "地址", en: "Address" },
      { zh: "地图", en: "Map" },
      { zh: "询价按钮", en: "Enquiry Button" },
    ],
    cta: { zh: "立即询价", en: "Send Enquiry" },
  },
];

const strengths = [
  {
    icon: Globe2,
    title: "国际贸易视野",
    text: "以 TIAN YI INTERNATIONAL TRADING PTE. LTD 为主体，面向多品类消费品采购与供应协同，兼顾跨区域资源对接和本地交付体验。",
  },
  {
    icon: Warehouse,
    title: "稳定货源组织",
    text: "围绕水果、蔬菜、食品组合及日常消费品，按季节、品质、规格和订单需求进行筛选，减少客户反复比价与沟通成本。",
  },
  {
    icon: ClipboardCheck,
    title: "订单确认机制",
    text: "客户提交意向后，由工作人员进一步确认库存、配送时间、替换方案和付款安排，让线上下单更稳妥。",
  },
  {
    icon: ShieldCheck,
    title: "品质与履约意识",
    text: "重视商品新鲜度、包装完整度、交付时效和售后沟通，适合家庭补给、企业福利、社区团购与小批量采购。",
  },
];

const serviceFlow = [
  "需求沟通与规格确认",
  "供应筛选与价格反馈",
  "订单锁定与备货安排",
  "配送交付与售后跟进",
];

const serviceScenes = [
  "家庭日常鲜食采购",
  "办公室水果补给",
  "企业福利与节日礼盒",
  "社区团购与小批量配送",
  "餐饮门店基础食材补充",
  "定制化组合套餐",
];

const uiCopy = {
  zh: {
    homeLabel: "首页",
    navLabel: "主要导航",
    cartOpenTitle: "打开购物车",
    cartOpenLabel: (count: number) => `打开购物车，当前 ${count} 件商品`,
    shop: "在线选购",
    heroTitle: "天一国际贸易",
    heroDescription:
      "面向家庭、办公室、社区客户和企业采购需求，提供精选食品、生鲜与日常消费品供应服务。我们从货源组织、订单确认到配送跟进形成闭环，让采购更可靠、更省心。",
    heroPrimary: "了解公司简介",
    heroSecondary: "在线选购",
    heroImageLabel: "食品供应与贸易服务",
    heroImageAlt: "摆满蔬菜水果的生鲜货架",
    heroBadge: "供应整合 · 订单确认 · 配送跟进",
    homeOverviewLabel: "网站主要页面",
    shopSummary: "进入商品页面，按分类挑选商品并提交采购订单。",
    templateEyebrow: "公司信息模板",
    pending: "待补充",
    productEyebrow: "在线选购",
    productTitle: "精选商品与组合采购",
    categoryLabel: "商品分类",
    featured: "推荐",
    addToCart: "加入",
    addToCartLabel: (name: string) => `加入购物车：${name}`,
    assuranceLabel: "服务承诺",
    assurance: [
      ["按需备货", "根据订单需求确认规格、数量和替换方案。"],
      ["多场景供应", "支持家庭、办公室、社区和企业福利采购。"],
      ["人工跟进", "订单提交后由工作人员完成确认与沟通。"],
    ],
    cart: "购物车",
    items: (count: number) => `${count} 件商品`,
    mobileItems: (count: number) => `${count} 件`,
    collapseCart: "收起购物车",
    closeCart: "关闭购物车",
    orderSent: "订单意向已提交",
    orderNumber: (orderNumber: string) => `订单编号：${orderNumber}。`,
    orderSentText: "工作人员收到后会尽快联系你确认配送和付款。",
    submitFailed: "提交失败",
    submitFailedText: "请检查网络后重新提交，或直接联系工作人员下单。",
    emptyCart: "购物车还是空的",
    emptyCartText: "先挑几样适合的商品或组合套餐吧。",
    decrease: "减少数量",
    increase: "增加数量",
    remove: "移除商品",
    decreaseLabel: (name: string) => `减少 ${name} 数量`,
    increaseLabel: (name: string) => `增加 ${name} 数量`,
    removeLabel: (name: string) => `移除 ${name}`,
    total: "订单合计",
    formSubject: "TIAN YI INTERNATIONAL TRADING PTE. LTD 新订单",
    honeypot: "不要填写：",
    name: "姓名",
    namePlaceholder: "联系人姓名",
    contact: "电话或邮箱",
    contactPlaceholder: "用于确认订单",
    address: "配送地址",
    addressPlaceholder: "小区、街道或详细地址",
    notes: "备注",
    notesPlaceholder: "配送时间、采购用途、替换偏好等",
    clear: "清空",
    sending: "提交中",
    submitOrder: "提交订单意向",
    backdropLabel: "关闭购物车遮罩",
  },
  en: {
    homeLabel: "Home",
    navLabel: "Main navigation",
    cartOpenTitle: "Open cart",
    cartOpenLabel: (count: number) => `Open cart, ${count} items selected`,
    shop: "Shop Online",
    heroTitle: "Tian Yi International Trading",
    heroDescription:
      "We supply selected food products, fresh produce, and daily consumer goods for homes, offices, communities, and business buyers. From sourcing and order confirmation to delivery follow-up, we make procurement more reliable and easier to manage.",
    heroPrimary: "View Company Profile",
    heroSecondary: "Shop Online",
    heroImageLabel: "Food supply and trading services",
    heroImageAlt: "Fresh produce shelves filled with vegetables and fruits",
    heroBadge: "Supply · Order Confirmation · Delivery Follow-up",
    homeOverviewLabel: "Main website pages",
    shopSummary: "Browse products by category, add items to cart, and submit a purchase enquiry.",
    templateEyebrow: "Company Information Template",
    pending: "To be added",
    productEyebrow: "Shop Online",
    productTitle: "Selected Products and Bundled Procurement",
    categoryLabel: "Product categories",
    featured: "Featured",
    addToCart: "Add",
    addToCartLabel: (name: string) => `Add to cart: ${name}`,
    assuranceLabel: "Service Commitments",
    assurance: [
      ["Order-based Preparation", "Confirm specifications, quantity, and replacement options based on each order."],
      ["Multi-scenario Supply", "Support home, office, community, and corporate procurement needs."],
      ["Manual Follow-up", "Staff will confirm details and communicate after an order is submitted."],
    ],
    cart: "Cart",
    items: (count: number) => `${count} item${count === 1 ? "" : "s"}`,
    mobileItems: (count: number) => `${count} item${count === 1 ? "" : "s"}`,
    collapseCart: "Collapse cart",
    closeCart: "Close cart",
    orderSent: "Order enquiry submitted",
    orderNumber: (orderNumber: string) => `Order number: ${orderNumber}. `,
    orderSentText: "Our staff will contact you soon to confirm delivery and payment.",
    submitFailed: "Submission failed",
    submitFailedText: "Please check your connection and submit again, or contact our staff directly.",
    emptyCart: "Your cart is empty",
    emptyCartText: "Choose a few products or bundles to get started.",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    remove: "Remove item",
    decreaseLabel: (name: string) => `Decrease quantity for ${name}`,
    increaseLabel: (name: string) => `Increase quantity for ${name}`,
    removeLabel: (name: string) => `Remove ${name}`,
    total: "Order total",
    formSubject: "New order for TIAN YI INTERNATIONAL TRADING PTE. LTD",
    honeypot: "Do not fill this in:",
    name: "Name",
    namePlaceholder: "Contact name",
    contact: "Phone or email",
    contactPlaceholder: "For order confirmation",
    address: "Delivery address",
    addressPlaceholder: "Building, street, or full address",
    notes: "Notes",
    notesPlaceholder: "Delivery time, purchase purpose, replacement preferences, etc.",
    clear: "Clear",
    sending: "Submitting",
    submitOrder: "Submit Order Enquiry",
    backdropLabel: "Close cart overlay",
  },
} as const;

const categoryLabels: Record<Language, Record<string, string>> = {
  zh: {
    全部: "全部",
    水果: "水果",
    蔬菜: "蔬菜",
    组合套餐: "组合套餐",
  },
  en: {
    全部: "All",
    水果: "Fruits",
    蔬菜: "Vegetables",
    组合套餐: "Bundles",
  },
};

const productText: Record<
  string,
  Record<Language, { name: string; description: string; unit: string }>
> = {
  "apple-fuji": {
    zh: { name: "山东红富士苹果", description: "清甜脆爽，产地分级供应，适合家庭、办公室与礼盒组合。", unit: "斤" },
    en: { name: "Shandong Fuji Apples", description: "Sweet and crisp apples, graded by origin and suitable for homes, offices, and gift boxes.", unit: "jin" },
  },
  "orange-navel": {
    zh: { name: "赣南脐橙", description: "果汁充足，酸甜平衡，按批次筛选并安排新鲜配送。", unit: "斤" },
    en: { name: "Gannan Navel Oranges", description: "Juicy oranges with balanced sweetness and acidity, selected by batch for fresh delivery.", unit: "jin" },
  },
  banana: {
    zh: { name: "高山香蕉", description: "自然熟化，口感绵密，适合日常补给和团体采购。", unit: "斤" },
    en: { name: "Highland Bananas", description: "Naturally ripened bananas with a soft texture, suitable for daily supply and group purchases.", unit: "jin" },
  },
  strawberry: {
    zh: { name: "精品草莓", description: "颗粒饱满，果香明显，适合高品质鲜果订单。", unit: "盒" },
    en: { name: "Premium Strawberries", description: "Plump berries with a bright aroma, ideal for premium fresh fruit orders.", unit: "box" },
  },
  tomato: {
    zh: { name: "沙瓤番茄", description: "适合凉拌、煮汤和家常炒菜，批量采购可提前确认规格。", unit: "斤" },
    en: { name: "Meaty Tomatoes", description: "Suitable for salads, soups, and home cooking. Specifications can be confirmed in advance for bulk orders.", unit: "jin" },
  },
  lettuce: {
    zh: { name: "有机生菜", description: "叶片鲜嫩，适合沙拉、轻食门店与家庭日常餐桌。", unit: "颗" },
    en: { name: "Organic Lettuce", description: "Tender leaves for salads, light-meal shops, and everyday home meals.", unit: "head" },
  },
  broccoli: {
    zh: { name: "西兰花", description: "花球紧实，适合餐饮备货、家庭配送和健康餐组合。", unit: "颗" },
    en: { name: "Broccoli", description: "Firm florets suitable for restaurant stock, home delivery, and healthy meal bundles.", unit: "head" },
  },
  carrot: {
    zh: { name: "胡萝卜", description: "耐储存、易搭配，适合长期稳定采购与组合配送。", unit: "斤" },
    en: { name: "Carrots", description: "Easy to store and pair with other produce, suitable for stable long-term purchasing and bundled delivery.", unit: "jin" },
  },
  "family-box": {
    zh: { name: "三日家庭鲜食箱", description: "含多款水果和蔬菜，适合 2-3 人家庭的周期性补给。", unit: "箱" },
    en: { name: "Three-day Family Fresh Box", description: "Includes assorted fruits and vegetables for regular supply to a family of 2-3 people.", unit: "box" },
  },
  "office-box": {
    zh: { name: "办公室水果补给箱", description: "多种易分食水果组合，适合企业下午茶和团队福利。", unit: "箱" },
    en: { name: "Office Fruit Supply Box", description: "An easy-to-share fruit assortment for office tea breaks and team benefits.", unit: "box" },
  },
};

function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const byteCharacters = window.atob(base64);
  const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function AdminDashboard() {
  const [password, setPassword] = useState(
    () => window.sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) ?? "",
  );
  const [inputPassword, setInputPassword] = useState(password);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord["order"] | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [
        order.orderNumber,
        order.customerName,
        order.contact,
        order.address,
        order.statusLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [orders, searchTerm]);

  const stats = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + order.orderTotal, 0);
    return {
      count: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      total,
    };
  }, [orders]);

  async function adminFetch(path: string, options: RequestInit = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        "X-Admin-Password": password,
      },
    });

    if (!response.ok) {
      throw new Error((await response.json()).error ?? "后台请求失败");
    }

    return response.json();
  }

  async function loadOrders(nextPassword = password) {
    if (!nextPassword) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin-orders", {
        headers: { "X-Admin-Password": nextPassword },
      });
      if (!response.ok) {
        throw new Error((await response.json()).error ?? "无法读取订单");
      }
      const data = (await response.json()) as { orders: AdminOrderSummary[] };
      setOrders(data.orders);
      if (data.orders[0] && !selectedOrderNumber) {
        setSelectedOrderNumber(data.orders[0].orderNumber);
      }
      setPassword(nextPassword);
      window.sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, nextPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法读取订单");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadOrderDetail(orderNumber: string) {
    if (!orderNumber || !password) return;
    setIsLoading(true);
    setError("");

    try {
      const data = (await adminFetch(
        `/api/admin-orders?orderNumber=${encodeURIComponent(orderNumber)}`,
      )) as AdminOrderRecord;
      setSelectedOrder(data.order);
      setSelectedOrderNumber(orderNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法读取订单详情");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(orderNumber: string, status: string) {
    setError("");
    try {
      await adminFetch("/api/admin-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, status }),
      });
      await loadOrders();
      await loadOrderDetail(orderNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法更新状态");
    }
  }

  async function deleteOrder(orderNumber: string) {
    const confirmed = window.confirm(
      `确定删除订单 ${orderNumber} 吗？删除后不能在后台恢复。`,
    );
    if (!confirmed) return;

    setError("");
    setIsLoading(true);
    try {
      await adminFetch("/api/admin-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      setSelectedOrder(null);
      setSelectedOrderNumber("");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法删除订单");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (password) void loadOrders(password);
  }, []);

  useEffect(() => {
    if (selectedOrderNumber && password) void loadOrderDetail(selectedOrderNumber);
  }, [selectedOrderNumber, password]);

  if (!password) {
    return (
      <main className="admin-page">
        <section className="admin-login">
          <div className="admin-login-mark">
            <Lock size={28} aria-hidden="true" />
          </div>
          <p className="eyebrow">TIAN YI ORDER ADMIN</p>
          <h1>订单管理后台</h1>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loadOrders(inputPassword);
            }}
          >
            <label>
              后台密码
              <input
                type="password"
                value={inputPassword}
                onChange={(event) => setInputPassword(event.target.value)}
                placeholder="输入后台密码"
              />
            </label>
            <button className="submit-button" type="submit" disabled={isLoading}>
              登录后台
            </button>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">TIAN YI ORDER ADMIN</p>
          <h1>订单管理后台</h1>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={() => void loadOrders()} disabled={isLoading}>
            <RefreshCw size={17} aria-hidden="true" />
            刷新
          </button>
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
              setPassword("");
              setInputPassword("");
              setOrders([]);
              setSelectedOrder(null);
            }}
          >
            退出
          </button>
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <section className="admin-stats">
        <div>
          <span>订单数</span>
          <strong>{stats.count}</strong>
        </div>
        <div>
          <span>待确认</span>
          <strong>{stats.pending}</strong>
        </div>
        <div>
          <span>订单金额</span>
          <strong>{formatCurrency(stats.total)}</strong>
        </div>
      </section>

      <section className="admin-layout">
        <div className="admin-list">
          <div className="admin-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索订单号、客户、电话、地址"
            />
          </div>
          <div className="admin-orders">
            {filteredOrders.map((order) => (
              <button
                className={
                  order.orderNumber === selectedOrderNumber ? "active" : ""
                }
                key={order.orderNumber}
                type="button"
                onClick={() => setSelectedOrderNumber(order.orderNumber)}
              >
                <strong>{order.orderNumber}</strong>
                <span>{order.customerName}</span>
                <small>
                  {order.statusLabel} · {formatCurrency(order.orderTotal)}
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-detail">
          {selectedOrder ? (
            <>
              <div className="admin-detail-head">
                <div>
                  <p className="eyebrow">订单详情</p>
                  <h2>{selectedOrder.order.orderNumber}</h2>
                </div>
                <select
                  value={selectedOrder.status}
                  onChange={(event) =>
                    void updateStatus(
                      selectedOrder.order.orderNumber,
                      event.target.value,
                    )
                  }
                >
                  {orderStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-info-grid">
                <div>
                  <span>客户</span>
                  <strong>{selectedOrder.order.customerName}</strong>
                </div>
                <div>
                  <span>联系方式</span>
                  <strong>{selectedOrder.order.contact}</strong>
                </div>
                <div>
                  <span>地址</span>
                  <strong>{selectedOrder.order.address}</strong>
                </div>
                <div>
                  <span>总金额</span>
                  <strong>{formatCurrency(selectedOrder.order.orderTotal)}</strong>
                </div>
              </div>

              <div className="admin-downloads">
                <button
                  type="button"
                  onClick={() =>
                    downloadBase64File(
                      selectedOrder.packingSlipPdfBase64,
                      selectedOrder.packingSlipFilename,
                      "application/pdf",
                    )
                  }
                >
                  <FileText size={17} aria-hidden="true" />
                  下载配货单 PDF
                  <Download size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadBase64File(
                      selectedOrder.invoiceSpreadsheetBase64,
                      selectedOrder.invoiceFilename,
                      "application/vnd.ms-excel",
                    )
                  }
                >
                  <FileSpreadsheet size={17} aria-hidden="true" />
                  下载 Invoice Excel
                  <Download size={16} aria-hidden="true" />
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() => void deleteOrder(selectedOrder.order.orderNumber)}
                  disabled={isLoading}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  删除订单
                </button>
              </div>

              <table className="admin-items">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.order.items.map((item) => (
                    <tr key={`${item.id}-${item.name}`}>
                      <td>{item.name}</td>
                      <td>
                        {item.quantity} {item.unit}
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="admin-notes">
                <span>备注</span>
                <p>{selectedOrder.order.notes || "无"}</p>
              </div>
            </>
          ) : (
            <div className="admin-empty">还没有选择订单。</div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(value);
}

function readCart(): CartState {
  try {
    const saved = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as CartState;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, quantity]) => Number(quantity) > 0),
    );
  } catch {
    return {};
  }
}

function readLanguage(): Language {
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === "en" ? "en" : "zh";
}

type PublicPage =
  | "home"
  | "company"
  | "product-range"
  | "advantages"
  | "clients"
  | "contact"
  | "shop";

function getPublicPage(): PublicPage {
  switch (window.location.pathname) {
    case "/company":
      return "company";
    case "/product-range":
      return "product-range";
    case "/advantages":
    case "/services":
      return "advantages";
    case "/clients":
      return "clients";
    case "/contact":
      return "contact";
    case "/shop":
      return "shop";
    default:
      return "home";
  }
}

function App() {
  if (window.location.pathname === "/admin") {
    return <AdminDashboard />;
  }

  const page = getPublicPage();
  const isHome = page === "home";
  const showShop = ENABLE_ONLINE_SHOP && page === "shop";
  const activeCompanyModule = companyProfileModules.find(
    (module) => module.slug === page,
  );
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const copy = uiCopy[language];
  const languageLabels =
    language === "zh"
      ? { zh: "中文", en: "英文" }
      : { zh: "Chinese", en: "English" };

  const [activeCategory, setActiveCategory] = useState<
    typeof ALL_CATEGORY | ProductCategory
  >(ALL_CATEGORY);
  const [cart, setCart] = useState<CartState>(() => readCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submitState, setSubmitState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [lastOrderNumber, setLastOrderNumber] = useState("");

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return products;
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory]);

  const cartLines = useMemo<CartLine[]>(() => {
    return products
      .filter((product) => cart[product.id])
      .map((product) => ({ product, quantity: cart[product.id] }));
  }, [cart]);

  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const orderTotal = cartLines.reduce(
    (sum, line) => sum + line.quantity * line.product.price,
    0,
  );

  const cartPayload = JSON.stringify(
    cartLines.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      price: line.product.price,
      unit: line.product.unit,
      quantity: line.quantity,
      subtotal: Number((line.quantity * line.product.price).toFixed(2)),
    })),
    null,
    2,
  );

  function getProductDisplay(product: Product) {
    return productText[product.id]?.[language] ?? {
      name: product.name,
      description: product.description,
      unit: product.unit,
    };
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setIsLanguageOpen(false);
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }
      return next;
    });
  }

  function addToCart(product: Product) {
    updateQuantity(product.id, (cart[product.id] ?? 0) + 1);
    setSubmitState("idle");
    setLastOrderNumber("");
    setIsCartOpen(true);
  }

  function clearCart() {
    setCart({});
    setSubmitState("idle");
    setLastOrderNumber("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (itemCount === 0) {
      setIsCartOpen(true);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitState("sending");

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.get("customerName"),
          contact: formData.get("contact"),
          address: formData.get("address"),
          notes: formData.get("notes"),
          orderTotal: Number(orderTotal.toFixed(2)),
          items: cartLines.map((line) => ({
            id: line.product.id,
            name: line.product.name,
            price: line.product.price,
            unit: line.product.unit,
            quantity: line.quantity,
          })),
        }),
      });

      if (!orderResponse.ok) {
        throw new Error(await orderResponse.text());
      }

      const orderResult = (await orderResponse.json()) as OrderApiResponse;
      const encodedData = new URLSearchParams();
      formData.forEach((value, key) => {
        if (key === "cartItems" || key === "orderTotal") return;
        encodedData.append(key, String(value));
      });
      encodedData.append("orderNumber", orderResult.order.orderNumber);
      encodedData.append(
        "cartItems",
        JSON.stringify(orderResult.order.items, null, 2),
      );
      encodedData.append("orderTotal", orderResult.order.orderTotal.toFixed(2));
      encodedData.append("packingSlipFilename", orderResult.packingSlipFilename);
      encodedData.append("invoiceFilename", orderResult.invoiceFilename);
      encodedData.append("packingSlipPdfBase64", orderResult.packingSlipPdfBase64);
      encodedData.append(
        "invoiceSpreadsheetBase64",
        orderResult.invoiceSpreadsheetBase64,
      );
      encodedData.append(
        "emailStatus",
        orderResult.email?.sent
          ? "sent"
          : `not sent: ${orderResult.email?.reason ?? "email service is not configured"}`,
      );

      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodedData.toString(),
      });
      window.localStorage.removeItem(CART_STORAGE_KEY);
      form.reset();
      setCart({});
      setLastOrderNumber(orderResult.order.orderNumber);
      setSubmitState("sent");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <main>
      <section className="top-band">
        <header className="site-header">
          <a
            className="brand"
            href="/"
            aria-label={`TIAN YI INTERNATIONAL TRADING PTE. LTD ${copy.homeLabel}`}
          >
            <span className="brand-mark">
              <Leaf size={24} aria-hidden="true" />
            </span>
            <span>
              <strong>TIAN YI</strong>
              <small>International Trading</small>
            </span>
          </a>
          <nav className="site-nav" aria-label={copy.navLabel}>
            {companyProfileModules.map((module) => (
              <a
                className={page === module.slug ? "active" : ""}
                href={`/${module.slug}`}
                key={module.slug}
              >
                {module.title[language]}
              </a>
            ))}
            {ENABLE_ONLINE_SHOP && (
              <a className={showShop ? "active" : ""} href="/shop">
                {copy.shop}
              </a>
            )}
          </nav>
          <div className={`language-switcher ${isLanguageOpen ? "open" : ""}`}>
            <button
              className="language-toggle"
              type="button"
              onClick={() => setIsLanguageOpen((current) => !current)}
              aria-expanded={isLanguageOpen}
            >
              {languageLabels[language]}
              <ChevronRight size={15} aria-hidden="true" />
            </button>
            {isLanguageOpen && (
              <div className="language-menu" role="menu">
                <button
                  className={language === "zh" ? "active" : ""}
                  type="button"
                  onClick={() => changeLanguage("zh")}
                  role="menuitem"
                >
                  {languageLabels.zh}
                </button>
                <button
                  className={language === "en" ? "active" : ""}
                  type="button"
                  onClick={() => changeLanguage("en")}
                  role="menuitem"
                >
                  {languageLabels.en}
                </button>
              </div>
            )}
          </div>
          {ENABLE_ONLINE_SHOP && (
            <button
              className="cart-button"
              type="button"
              onClick={() => setIsCartOpen(true)}
              title={copy.cartOpenTitle}
              aria-label={copy.cartOpenLabel(itemCount)}
            >
              <ShoppingBasket size={21} aria-hidden="true" />
              <span>{itemCount}</span>
            </button>
          )}
        </header>

        <div className="hero">
          <div className="hero-copy">
            <p className="eyebrow">TIAN YI INTERNATIONAL TRADING PTE. LTD</p>
            <h1>{copy.heroTitle}</h1>
            <p>
              {copy.heroDescription}
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="/company">
                {copy.heroPrimary}
                <ChevronRight size={18} aria-hidden="true" />
              </a>
              {ENABLE_ONLINE_SHOP && (
                <a className="secondary-link" href="/shop">
                  {copy.heroSecondary}
                </a>
              )}
            </div>
          </div>
          <div className="hero-image" aria-label={copy.heroImageLabel}>
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
              alt={copy.heroImageAlt}
            />
            <div className="hero-badge">
              <BadgeCheck size={19} aria-hidden="true" />
              <span>{copy.heroBadge}</span>
            </div>
          </div>
        </div>
      </section>

      {isHome && (
        <section className="home-overview" aria-label={copy.homeOverviewLabel}>
          {companyProfileModules.map((module) => (
            <a href={`/${module.slug}`} key={module.slug}>
              <strong>{module.title[language]}</strong>
              <span>{module.summary[language]}</span>
            </a>
          ))}
          {ENABLE_ONLINE_SHOP && (
            <a href="/shop">
              <strong>{copy.shop}</strong>
              <span>{copy.shopSummary}</span>
            </a>
          )}
        </section>
      )}

      {activeCompanyModule && (
        <>
      <section className="template-section" id="company" aria-labelledby="company-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">{copy.templateEyebrow}</p>
            <h2 id="company-title">{activeCompanyModule.title[language]}</h2>
          </div>
        </div>
        <div className="template-grid single">
          {[activeCompanyModule].map((module) => {
            const Icon = module.icon;
            return (
              <article className="template-card" key={module.slug}>
                <span className="template-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <div>
                  <h3>{module.title[language]}</h3>
                  <p>{module.summary[language]}</p>
                </div>
                {"content" in module && module.content ? (
                  <div className="template-content">
                    {module.content[language].map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                <ul className="template-list">
                  {module.fields.map((field) => (
                    <li key={field.zh}>
                      <strong>{field[language]}</strong>
                      <span>{copy.pending}</span>
                    </li>
                  ))}
                </ul>
                {module.cta && (
                  <a className="template-cta" href="mailto:tianyi011224@gmail.com">
                    {module.cta[language]}
                    <ChevronRight size={17} aria-hidden="true" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </section>
        </>
      )}

      {showShop && (
        <>
      <section className="shop-section" id="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.productEyebrow}</p>
            <h2>{copy.productTitle}</h2>
          </div>
          <div className="category-tabs" aria-label={copy.categoryLabel}>
            {categories.map((category) => (
              <button
                key={category}
                className={category === activeCategory ? "active" : ""}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {categoryLabels[language][category]}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {visibleProducts.map((product) => {
            const displayProduct = getProductDisplay(product);
            return (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  <img src={product.image} alt={displayProduct.name} />
                  {product.featured && <span>{copy.featured}</span>}
                </div>
                <div className="product-body">
                  <div>
                    <p className="category-label">
                      {categoryLabels[language][product.category]}
                    </p>
                    <h3>{displayProduct.name}</h3>
                    <p>{displayProduct.description}</p>
                  </div>
                  <div className="product-footer">
                    <strong>
                      {formatCurrency(product.price)}
                      <small> / {displayProduct.unit}</small>
                    </strong>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      title={copy.addToCartLabel(displayProduct.name)}
                      aria-label={copy.addToCartLabel(displayProduct.name)}
                    >
                      <Plus size={18} aria-hidden="true" />
                      {copy.addToCart}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="assurance-section" aria-label={copy.assuranceLabel}>
        {copy.assurance.map(([title, text], index) => {
          const Icon = [PackageCheck, Store, UsersRound][index];
          return (
            <div key={title}>
              <Icon size={24} aria-hidden="true" />
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          );
        })}
      </section>
        </>
      )}

      {ENABLE_ONLINE_SHOP && (
      <aside className={`cart-panel ${isCartOpen ? "open" : ""}`}>
        <div className="cart-header">
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsCartOpen(false)}
            title={copy.collapseCart}
            aria-label={copy.collapseCart}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div>
            <p className="eyebrow">{copy.cart}</p>
            <h2>{copy.items(itemCount)}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsCartOpen(false)}
            title={copy.closeCart}
            aria-label={copy.closeCart}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {cartLines.length === 0 ? (
          <div className="empty-cart">
            {submitState === "sent" ? (
              <>
                <CheckCircle2 size={42} aria-hidden="true" />
                <h3>{copy.orderSent}</h3>
                <p>
                  {lastOrderNumber
                    ? copy.orderNumber(lastOrderNumber)
                    : ""}
                  {copy.orderSentText}
                </p>
              </>
            ) : submitState === "error" ? (
              <>
                <ShoppingBasket size={42} aria-hidden="true" />
                <h3>{copy.submitFailed}</h3>
                <p>{copy.submitFailedText}</p>
              </>
            ) : (
              <>
                <ShoppingBasket size={42} aria-hidden="true" />
                <h3>{copy.emptyCart}</h3>
                <p>{copy.emptyCartText}</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {cartLines.map((line) => {
                const displayProduct = getProductDisplay(line.product);
                return (
                  <div className="cart-line" key={line.product.id}>
                    <img src={line.product.image} alt={displayProduct.name} />
                    <div className="cart-line-info">
                      <strong>{displayProduct.name}</strong>
                      <span>
                        {formatCurrency(line.product.price)} / {displayProduct.unit}
                      </span>
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.product.id, line.quantity - 1)
                          }
                          title={copy.decrease}
                          aria-label={copy.decreaseLabel(displayProduct.name)}
                        >
                          <Minus size={15} aria-hidden="true" />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(line.product.id, line.quantity + 1)
                          }
                          title={copy.increase}
                          aria-label={copy.increaseLabel(displayProduct.name)}
                        >
                          <Plus size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <button
                      className="remove-button"
                      type="button"
                      onClick={() => updateQuantity(line.product.id, 0)}
                      title={copy.remove}
                      aria-label={copy.removeLabel(displayProduct.name)}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <span>{copy.total}</span>
              <strong>{formatCurrency(orderTotal)}</strong>
            </div>

            <form
              className="checkout-form"
              name="fresh-order"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value="fresh-order" />
              <input
                type="hidden"
                name="subject"
                value={copy.formSubject}
              />
              <p className="hidden-field">
                <label>
                  {copy.honeypot}
                  <input name="bot-field" />
                </label>
              </p>
              <input type="hidden" name="cartItems" value={cartPayload} />
              <input
                type="hidden"
                name="orderTotal"
                value={orderTotal.toFixed(2)}
              />
              <label>
                {copy.name}
                <input
                  name="customerName"
                  type="text"
                  placeholder={copy.namePlaceholder}
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                {copy.contact}
                <input
                  name="contact"
                  type="text"
                  placeholder={copy.contactPlaceholder}
                  autoComplete="tel"
                  required
                />
              </label>
              <label>
                {copy.address}
                <input
                  name="address"
                  type="text"
                  placeholder={copy.addressPlaceholder}
                  autoComplete="street-address"
                  required
                />
              </label>
              <label>
                {copy.notes}
                <textarea
                  name="notes"
                  placeholder={copy.notesPlaceholder}
                  rows={3}
                />
              </label>
              <div className="form-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={clearCart}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  {copy.clear}
                </button>
                <button
                  className="submit-button"
                  type="submit"
                  disabled={submitState === "sending"}
                >
                  {submitState === "sending" ? copy.sending : copy.submitOrder}
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          </>
        )}
      </aside>
      )}

      {ENABLE_ONLINE_SHOP && isCartOpen && (
        <button
          className="cart-backdrop"
          type="button"
          aria-label={copy.backdropLabel}
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {ENABLE_ONLINE_SHOP && (
      <button
        className="mobile-cart-bar"
        type="button"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingBasket size={20} aria-hidden="true" />
        <span>{copy.mobileItems(itemCount)}</span>
        <strong>{formatCurrency(orderTotal)}</strong>
      </button>
      )}
    </main>
  );
}

export default App;
