import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Handshake,
  Leaf,
  Lock,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
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

const companyPurposeCards = [
  {
    title: { zh: "使命", en: "Mission" },
    body: {
      zh: "以稳定品质、及时配送和用心服务，为新加坡餐饮、船舶及企业客户提供高效的一站式食品与厨房用品供应。",
      en: "To provide Singapore's F&B, vessel, and corporate customers with reliable one-stop food and kitchen supply through consistent quality, timely delivery, and attentive service.",
    },
  },
  {
    title: { zh: "愿景", en: "Vision" },
    body: {
      zh: "成为新加坡值得长期信赖的食品及后勤物资供应伙伴，以专业供应链连接并响应客户的每一次需求。",
      en: "To become Singapore's trusted long-term partner for food and logistics supplies, supported by a professional and responsive supply chain.",
    },
  },
  {
    title: { zh: "价值观", en: "Values" },
    items: [
      { zh: "品质稳定", en: "Consistent quality" },
      { zh: "及时负责", en: "Timely and accountable" },
      { zh: "客户为先", en: "Customer first" },
      { zh: "诚信共赢", en: "Integrity and shared success" },
    ],
  },
];

const companySourceHighlights = [
  {
    origin: { zh: "中国 · 山东", en: "Shandong, China" },
    products: { zh: "胡萝卜、洋葱、土豆", en: "Carrots, Onions & Potatoes" },
    benefit: {
      zh: "规模化种植与分级供应，规格稳定、耐储存，适合餐饮后厨批量备货。",
      en: "Scaled cultivation and graded supply provide consistent sizing and good storage performance for bulk kitchen use.",
    },
    image:
      "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "中国 · 云南", en: "Yunnan, China" },
    products: { zh: "高原叶菜、菌菇、西兰花", en: "Leafy Greens, Mushrooms & Broccoli" },
    benefit: {
      zh: "高原气候与昼夜温差有利于蔬菜生长，叶色清新、口感爽脆、品类丰富。",
      en: "Highland conditions and day-night temperature changes support crisp texture, fresh colour, and broad variety.",
    },
    image:
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "马来西亚 · 金马仑高原", en: "Cameron Highlands, Malaysia" },
    products: { zh: "生菜、番茄、彩椒", en: "Lettuce, Tomatoes & Capsicum" },
    benefit: {
      zh: "高地环境适合多种温凉蔬菜，距离新加坡较近，有利于缩短运输与补货时间。",
      en: "The cool highland climate supports varied produce, while proximity to Singapore helps shorten replenishment time.",
    },
    image:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "中国 · 广西与海南", en: "Guangxi & Hainan, China" },
    products: { zh: "柑橘、芒果、菠萝", en: "Citrus, Mangoes & Pineapples" },
    benefit: {
      zh: "日照充足、热量条件良好，热带与亚热带水果果香明显、汁水充足。",
      en: "Abundant sunshine and warm growing conditions support aromatic tropical fruit with generous juiciness.",
    },
    image:
      "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "泰国", en: "Thailand" },
    products: { zh: "香蕉、椰青、龙眼", en: "Bananas, Young Coconuts & Longan" },
    benefit: {
      zh: "热带水果供应经验成熟，风味浓郁，可按成熟度和使用时间安排采购。",
      en: "Established tropical fruit supply supports rich flavour and sourcing based on ripeness and intended use.",
    },
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "新西兰", en: "New Zealand" },
    products: { zh: "苹果、奇异果", en: "Apples & Kiwifruit" },
    benefit: {
      zh: "温带气候与成熟的分级体系，使果品口感清脆、规格清晰，适合零售与团体采购。",
      en: "A temperate climate and mature grading system support crisp fruit and clear specifications for retail and group orders.",
    },
    image:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "澳大利亚", en: "Australia" },
    products: { zh: "牛肉、羊肉", en: "Beef & Lamb" },
    benefit: {
      zh: "供应链标准成熟，产品分级与规格选择丰富，便于餐厅按菜单和成本要求采购。",
      en: "Mature supply standards and varied grades make it easier for restaurants to buy against menu and cost requirements.",
    },
    image:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=84",
  },
  {
    origin: { zh: "巴西", en: "Brazil" },
    products: { zh: "鸡肉、牛肉", en: "Chicken & Beef" },
    benefit: {
      zh: "出口加工体系完善，产品规格标准化，适合餐饮、食堂和船舶的大批量供应需求。",
      en: "Established export processing and standardised specifications support volume requirements for F&B, canteens, and vessels.",
    },
    image:
      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=84",
  },
];

const productRangeCatalog = [
  {
    name: { zh: "番茄", en: "Tomatoes" },
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "黄瓜", en: "Cucumbers" },
    image: "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "洋葱与土豆", en: "Onions & Potatoes" },
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "胡萝卜", en: "Carrots" },
    image: "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "西兰花", en: "Broccoli" },
    image: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "生菜与叶菜", en: "Lettuce & Leafy Greens" },
    image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "苹果与梨", en: "Apples & Pears" },
    image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "柑橘类", en: "Citrus Fruits" },
    image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "香蕉", en: "Bananas" },
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "草莓与莓果", en: "Strawberries & Berries" },
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "热带水果", en: "Tropical Fruits" },
    image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "牛油果", en: "Avocados" },
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "牛肉与羊肉", en: "Beef & Lamb" },
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "鸡肉", en: "Poultry" },
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "鱼类与海鲜", en: "Fish & Seafood" },
    image: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "鸡蛋与乳品", en: "Eggs & Dairy" },
    image: "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "调味品与香料", en: "Seasonings & Spices" },
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "大米与干货", en: "Rice & Dry Goods" },
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "厨房用品", en: "Kitchen Supplies" },
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=82",
  },
  {
    name: { zh: "船舶食品物资", en: "Ship Provisions" },
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=82",
  },
];

const supplyChainServices = [
  {
    title: { zh: "多渠道采购", en: "Multi-channel Procurement" },
    text: {
      zh: "结合本地批发市场、进口商及稳定供应渠道，根据客户品类、数量、预算和使用周期组织货源。",
      en: "We coordinate local wholesale, importer, and established supply channels around category, volume, budget, and usage cycle.",
    },
    image: "https://images.pexels.com/photos/11678438/pexels-photo-11678438.jpeg?auto=compress&cs=tinysrgb&w=1100",
  },
  {
    title: { zh: "品质筛选", en: "Quality Selection" },
    text: {
      zh: "按新鲜度、规格、外观和包装完整度进行人工确认，发现异常时及时沟通替换方案。",
      en: "Freshness, specifications, appearance, and packaging are manually checked, with alternatives discussed when issues arise.",
    },
    image: "https://images.pexels.com/photos/5964489/pexels-photo-5964489.jpeg?auto=compress&cs=tinysrgb&w=1100",
  },
  {
    title: { zh: "仓储分拣", en: "Sorting & Order Separation" },
    text: {
      zh: "按照客户、订单和配送路线分类整理货物，核对数量与包装要求，减少配货错漏。",
      en: "Goods are separated by customer, order, and route, with quantities and packing requirements checked before dispatch.",
    },
    image: "https://images.pexels.com/photos/4483862/pexels-photo-4483862.jpeg?auto=compress&cs=tinysrgb&w=1100",
  },
  {
    title: { zh: "定制配货", en: "Custom Order Packing" },
    text: {
      zh: "可根据菜单、船员人数、预算或固定采购清单，组合蔬果、肉类、干货、调味品及厨房用品。",
      en: "Produce, meat, dry goods, seasonings, and kitchen supplies can be combined around menus, crew size, budgets, or recurring lists.",
    },
    image: "https://images.pexels.com/photos/4451870/pexels-photo-4451870.jpeg?auto=compress&cs=tinysrgb&w=1100",
  },
  {
    title: { zh: "新加坡配送", en: "Singapore Delivery" },
    text: {
      zh: "结合收货时间、订单体量和配送路线安排交付，服务餐厅、企业及港口相关客户。",
      en: "Delivery is arranged around receiving time, order volume, and route for restaurants, businesses, and port-related customers.",
    },
    image: "https://images.pexels.com/photos/29786116/pexels-photo-29786116.jpeg?auto=compress&cs=tinysrgb&w=1100",
  },
  {
    title: { zh: "订单跟进", en: "Order Follow-up" },
    text: {
      zh: "由工作人员确认库存、替代品、配送和付款安排，并持续记录客户反馈与后续采购需求。",
      en: "Staff confirm stock, substitutions, delivery, and payment arrangements while recording feedback and recurring requirements.",
    },
    image: "https://images.pexels.com/photos/7682337/pexels-photo-7682337.jpeg?auto=compress&cs=tinysrgb&w=1100",
  },
];

const companyProfileModules = [
  {
    slug: "company",
    icon: Store,
    title: { zh: "公司简介", en: "Company Profile" },
    summary: {
      zh: "新加坡本地餐饮、船舶与企业客户的一站式食品及厨房用品供应伙伴。",
      en: "A Singapore-based supply partner for F&B, vessel, and corporate food procurement.",
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
      {
        zh: "成立时间",
        en: "Year Established",
        value: { zh: "2023 年，成立于新加坡", en: "Established in Singapore in 2023" },
      },
      {
        zh: "主营业务",
        en: "Main Business",
        value: {
          zh: "食品、生鲜、调味品、干货、厨房用品及船舶食品物资供应",
          en: "Food, fresh produce, seasonings, dry goods, kitchen essentials, and ship provisions",
        },
      },
      {
        zh: "服务城市/区域",
        en: "Service Cities / Areas",
        value: { zh: "新加坡本地餐饮、企业与港口相关客户", en: "F&B, corporate, and port-related customers in Singapore" },
      },
    ],
  },
  {
    slug: "product-range",
    icon: PackageCheck,
    title: { zh: "产品范围", en: "Product Range" },
    summary: {
      zh: "围绕餐饮后厨、企业补给和船舶日常需求组织多品类供应。",
      en: "Multi-category supply for F&B kitchens, corporate procurement, and vessel daily needs.",
    },
    fields: [
      { zh: "水果", en: "Fruits", value: { zh: "日常鲜果、办公室水果、礼盒及组合采购", en: "Daily fruits, office fruit boxes, gift packs, and bundle orders" } },
      { zh: "蔬菜", en: "Vegetables", value: { zh: "餐饮后厨、家庭配送和小批量稳定补货", en: "Kitchen supply, home delivery, and recurring small-batch replenishment" } },
      { zh: "调味品与干货", en: "Seasonings and Dry Goods", value: { zh: "中餐门店常用调料、干货及基础食品物资", en: "Common Chinese F&B seasonings, dry goods, and staple supplies" } },
      { zh: "厨房用品", en: "Kitchen Supplies", value: { zh: "后厨日常消耗品与常用配套物品", en: "Daily kitchen consumables and related essentials" } },
      { zh: "船舶食品物资", en: "Ship Provisions", value: { zh: "面向停靠新加坡港口船舶的伙食及后勤补给", en: "Food and logistics support for vessels calling at Singapore ports" } },
      { zh: "组合套餐", en: "Procurement Bundles", value: { zh: "按家庭、办公室、企业福利和社区团购场景组合", en: "Custom bundles for homes, offices, corporate welfare, and group buys" } },
    ],
  },
  {
    slug: "join-us",
    icon: UsersRound,
    title: { zh: "加入我们", en: "Join Us" },
    summary: {
      zh: "欢迎重视食品品质、客户服务与团队协作的伙伴加入 TIAN YI。",
      en: "We welcome people who value food quality, customer service, and teamwork to join TIAN YI.",
    },
    fields: [
      { zh: "招聘方向", en: "Opportunities", value: { zh: "采购与供应协调、仓储配货、配送及客户服务", en: "Procurement coordination, warehouse packing, delivery, and customer service" } },
      { zh: "工作地点", en: "Work Location", value: { zh: "新加坡", en: "Singapore" } },
      { zh: "希望特质", en: "What We Value", value: { zh: "责任心、可靠守时、团队沟通及服务意识", en: "Responsibility, reliability, teamwork, and a service mindset" } },
      { zh: "相关经验", en: "Relevant Experience", value: { zh: "食品供应、餐饮、仓储或物流经验者优先", en: "Experience in food supply, F&B, warehousing, or logistics is preferred" } },
      { zh: "应聘资料", en: "Application Details", value: { zh: "姓名、联系方式、应聘方向及个人简历", en: "Name, contact details, preferred role, and resume" } },
      { zh: "投递邮箱", en: "Application Email", value: { zh: "tianyi011224@gmail.com（具体岗位以实际招聘需求为准）", en: "tianyi011224@gmail.com (roles are subject to current hiring needs)" } },
    ],
    cta: { zh: "发送应聘邮件", en: "Email Your Application" },
  },
];

const homeStats = [
  { value: "2023", label: { zh: "成立于新加坡", en: "Established in Singapore" } },
  { value: "F&B", label: { zh: "服务餐饮企业", en: "Serving F&B Businesses" } },
  { value: "Ship", label: { zh: "支持船舶补给", en: "Ship Provision Support" } },
];

const homeCompanyHighlights = [
  {
    value: { zh: "2023", en: "2023" },
    label: { zh: "成立年份", en: "Year Established" },
    image:
      "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1000&q=82",
  },
  {
    value: { zh: "新加坡", en: "Singapore" },
    label: { zh: "本地服务区域", en: "Local Service Area" },
    image:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=1000&q=82",
  },
  {
    value: { zh: "餐饮", en: "F&B" },
    label: { zh: "餐厅及后厨供应", en: "Restaurant Supply" },
    image:
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=1000&q=82",
  },
  {
    value: { zh: "船舶", en: "Vessels" },
    label: { zh: "食品物资补给", en: "Food Provision" },
    image:
      "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=1000&q=82",
  },
  {
    value: { zh: "一站式", en: "One-stop" },
    label: { zh: "采购与配送支持", en: "Procurement & Delivery" },
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=82",
  },
  {
    value: { zh: "新鲜", en: "Fresh" },
    label: { zh: "品质筛选与供货", en: "Quality-focused Supply" },
    image:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1000&q=82",
  },
];

const homeBusinessScopes = [
  {
    tab: { zh: "餐饮企业", en: "F&B Businesses" },
    title: { zh: "餐厅及后厨供应：稳定支持日常经营", en: "Restaurant supply for reliable daily operations" },
    text: {
      zh: "围绕中餐厅、餐饮门店及中央厨房的日常需求，提供新鲜蔬果、调味品、干货和常用厨房物品的一站式采购与配送支持。",
      en: "One-stop procurement and delivery of fresh produce, seasonings, dry goods, and kitchen essentials for restaurants, F&B outlets, and central kitchens.",
    },
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=84",
  },
  {
    tab: { zh: "酒店与食堂", en: "Hotels & Canteens" },
    title: { zh: "酒店与食堂：按用量安排周期供货", en: "Scheduled supply for hotels and canteens" },
    text: {
      zh: "根据酒店餐饮、学校食堂和企业食堂的品类、规格与使用周期，协助安排备货、替换方案及配送时间。",
      en: "Supply planning based on categories, specifications, consumption cycles, substitutions, and delivery schedules for hotels, schools, and corporate canteens.",
    },
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=84",
  },
  {
    tab: { zh: "船运公司", en: "Shipping Companies" },
    title: { zh: "船舶补给：配合靠港时间准备物资", en: "Ship provision aligned with port schedules" },
    text: {
      zh: "为停靠新加坡港口的船舶准备蔬果、主副食品、调料及厨房用品，并配合船运公司确认数量与交付安排。",
      en: "Produce, staple foods, seasonings, and kitchen supplies prepared for vessels calling at Singapore ports, with quantities and delivery coordinated with shipping companies.",
    },
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1400&q=84",
  },
  {
    tab: { zh: "超市与零售", en: "Retail & Supermarkets" },
    title: { zh: "零售供应：重视规格、包装与新鲜度", en: "Retail supply focused on quality and presentation" },
    text: {
      zh: "面向超市、零售门店及社区采购需求，按商品规格、包装方式、批量和交付频率进行供应沟通。",
      en: "Supply coordination for supermarkets, retail outlets, and community buyers based on product specifications, packaging, volume, and delivery frequency.",
    },
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=84",
  },
  {
    tab: { zh: "企业与加工", en: "Corporate & Processing" },
    title: { zh: "企业采购：灵活处理定制订单", en: "Flexible procurement for corporate requirements" },
    text: {
      zh: "为企业客户及食品加工相关客户提供多品类询价、组合采购和定制订单跟进，具体供应方案按实际需求确认。",
      en: "Multi-category quotations, combined procurement, and custom order follow-up for corporate and food-processing customers, confirmed according to actual requirements.",
    },
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=84",
  },
];

const homePartners = [
  {
    name: { zh: "绿茶餐厅", en: "Green Tea Restaurant" },
    logo: "/images/partners/green-tea.png",
    logoClass: "green-tea",
  },
  {
    name: { zh: "太二酸菜鱼", en: "Tai Er Sauerkraut Fish" },
    logo: "/images/partners/tai-er.png",
    logoClass: "tai-er",
  },
  {
    name: { zh: "客语", en: "Hakka Yu" },
    logo: "/images/partners/hakka-yu.webp",
    logoClass: "hakka-yu",
  },
  {
    name: { zh: "呷哺呷哺", en: "Xiabu Xiabu" },
    logo: "/images/partners/xiabu-xiabu.png",
    logoClass: "xiabu-xiabu",
  },
  {
    name: { zh: "莆田", en: "PUTIEN" },
    logo: "/images/partners/putien.png",
    logoClass: "putien",
  },
];

const homePartnerRows = [0, 2, 4].map((offset) => [
  ...homePartners.slice(offset),
  ...homePartners.slice(0, offset),
]);

const homeServices = [
  {
    icon: Truck,
    title: { zh: "一站式采购配送", en: "One-stop Procurement" },
    text: {
      zh: "围绕餐厅和船舶日常需求，整合蔬果、调味品、干货和厨房用品供应。",
      en: "Integrated supply of produce, seasonings, dry goods, and kitchen essentials for restaurants and vessels.",
    },
  },
  {
    icon: PackageCheck,
    title: { zh: "稳定日常供货", en: "Stable Daily Supply" },
    text: {
      zh: "按客户采购习惯和用量安排备货，帮助后厨减少临时采购压力。",
      en: "Prepare supply according to customer demand patterns to reduce last-minute purchasing pressure.",
    },
  },
  {
    icon: ClipboardCheck,
    title: { zh: "灵活询价跟进", en: "Flexible Enquiry Follow-up" },
    text: {
      zh: "根据品类、数量、配送时间和特殊需求，提供务实的沟通与确认。",
      en: "Provide practical confirmation based on product type, quantity, delivery timing, and specific needs.",
    },
  },
];

const homeProductGroups = [
  { zh: "新鲜水果", en: "Fresh Fruits" },
  { zh: "蔬菜", en: "Vegetables" },
  { zh: "调味品", en: "Seasonings" },
  { zh: "干货", en: "Dry Goods" },
  { zh: "厨房用品", en: "Kitchen Supplies" },
  { zh: "船舶食品物资", en: "Ship Food Supplies" },
];

const homeClientGroups = [
  { zh: "中国餐厅", en: "Chinese Restaurants" },
  { zh: "中餐经营者", en: "Chinese F&B Operators" },
  { zh: "船运公司", en: "Shipping Companies" },
  { zh: "船舶与船员", en: "Vessels and Crews" },
  { zh: "企业客户", en: "Corporate Clients" },
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
    heroTitle: "新加坡餐饮与船舶食品物资供应服务",
    heroDescription:
      "TIAN YI INTERNATIONAL TRADING PTE. LTD（添億公司）为本地餐饮企业、船运公司及企业客户提供蔬果、调味品、干货与厨房用品的一站式采购配送服务。",
    heroPrimary: "了解公司简介",
    heroSecondary: "在线选购",
    heroImageLabel: "餐饮食材与厨房用品供应",
    heroImageAlt: "餐饮厨房正在准备新鲜食材",
    heroBadge: "餐饮供应 · 船舶补给 · 及时配送",
    homeOverviewLabel: "网站主要页面",
    homeIntroTitle: "公司简介",
    homeIntroText:
      "TIAN YI INTERNATIONAL TRADING PTE. LTD（添億公司）成立于2023年，是一家位于新加坡的综合型食品及厨房用品供应公司，专注为本地餐饮企业及船运公司提供稳定、便捷、高效的一站式采购与配送服务。",
    homeBusinessTitle: "业务范围",
    homeBusinessContact: "联系我们",
    homeBusinessPrev: "上一项业务",
    homeBusinessNext: "下一项业务",
    homePartnersTitle: "合作伙伴",
    homePartnersLabel: "合作伙伴滚动展示",
    homeServicesEyebrow: "SOLUTIONS",
    homeServicesTitle: "一站式食品及厨房用品供应方案",
    homeProductsEyebrow: "CATEGORY",
    homeProductsTitle: "覆盖餐饮后厨和船舶日常所需品类",
    homeClientsEyebrow: "NETWORK",
    homeClientsTitle: "服务新加坡本地餐饮与船舶客户",
    homeContactTitle: "与 TIAN YI 建立供应合作",
    homeContactText: "如需稳定供货、船舶补给或厨房用品采购报价，欢迎通过邮箱联系我们。",
    homeContactButton: "发送询价邮件",
    // 页脚联系信息：中英文界面共用同一组新加坡办公室资料。
    footerContactTitle: "联系我们",
    footerOfficeTitle: "新加坡办公室",
    footerAddress: "办公地址：Blk 6 #01-228 Pasir Panjang Wholesale Centre Singapore 110006",
    footerPhone: "电话：90182456",
    footerBusinessEmail: "业务咨询：tianyi011224@gmail.com",
    footerWhatsapp: "WhatsApp\n二维码",
    footerWechat: "微信\n二维码",
    footerContactButton: "联系我们",
    footerCopyright: "版权所有©2026 TIAN YI INTERNATIONAL TRADING PTE. LTD 保留所有权利",
    shopSummary: "进入商品页面，按分类挑选商品并提交采购订单。",
    templateEyebrow: "公司信息",
    aboutUsTitle: "关于我们",
    productRangeHeroTitle: "产品与服务",
    productRangePanelTitle: "多品类一站式供应",
    productRangeIntro:
      "TIAN YI 为新加坡餐饮、船舶及企业客户供应新鲜蔬果、肉类、海鲜、调味品、干货和厨房用品，并可根据日常用量、菜单需求及配送周期组合采购。",
    productRangeNote: "具体品牌、产地、等级、包装和规格，以当日供应情况及报价确认为准。",
    pending: "请邮件确认",
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
    contactPlaceholder: "方便工作人员确认订单",
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
    heroTitle: "Food and Kitchen Supply Services for F&B and Vessels in Singapore",
    heroDescription:
      "TIAN YI INTERNATIONAL TRADING PTE. LTD supplies fruits, vegetables, seasonings, dry goods, and kitchen essentials for local F&B businesses, shipping companies, and corporate customers.",
    heroPrimary: "View Company Profile",
    heroSecondary: "Shop Online",
    heroImageLabel: "Food ingredients and kitchen supplies",
    heroImageAlt: "A commercial kitchen preparing fresh ingredients",
    heroBadge: "F&B Supply · Ship Provision · Timely Delivery",
    homeOverviewLabel: "Main website pages",
    homeIntroTitle: "Company Profile",
    homeIntroText:
      "Founded in 2023, TIAN YI INTERNATIONAL TRADING PTE. LTD is a Singapore-based food and kitchen supply company providing stable, convenient, and efficient one-stop procurement and delivery services for local F&B businesses and shipping companies.",
    homeBusinessTitle: "Business Scope",
    homeBusinessContact: "Contact Us",
    homeBusinessPrev: "Previous business area",
    homeBusinessNext: "Next business area",
    homePartnersTitle: "Partners",
    homePartnersLabel: "Scrolling partner showcase",
    homeServicesEyebrow: "SOLUTIONS",
    homeServicesTitle: "One-stop food and kitchen supply solutions",
    homeProductsEyebrow: "CATEGORY",
    homeProductsTitle: "Categories for F&B kitchens and vessel daily needs",
    homeClientsEyebrow: "NETWORK",
    homeClientsTitle: "Serving local F&B and vessel customers in Singapore",
    homeContactTitle: "Build a supply partnership with TIAN YI",
    homeContactText: "Contact us for stable supply, ship provision, or kitchen goods procurement quotations.",
    homeContactButton: "Send Enquiry Email",
    // 英文页脚文案与中文版字段保持一一对应，避免切换语言时出现内容缺失。
    footerContactTitle: "Contact Us",
    footerOfficeTitle: "Singapore Office",
    footerAddress: "Office address: Blk 6 #01-228 Pasir Panjang Wholesale Centre Singapore 110006",
    footerPhone: "Phone: 90182456",
    footerBusinessEmail: "Business enquiry: tianyi011224@gmail.com",
    footerWhatsapp: "WhatsApp\nQR Code",
    footerWechat: "WeChat\nQR Code",
    footerContactButton: "Contact Us",
    footerCopyright: "Copyright © 2026 TIAN YI INTERNATIONAL TRADING PTE. LTD. All rights reserved.",
    aboutUsTitle: "About Us",
    productRangeHeroTitle: "Products & Services",
    productRangePanelTitle: "One-stop Multi-category Supply",
    productRangeIntro:
      "TIAN YI supplies fresh produce, meat, seafood, seasonings, dry goods, and kitchen essentials for F&B, vessel, and corporate customers in Singapore, with procurement tailored to usage, menu, and delivery cycles.",
    productRangeNote:
      "Brand, origin, grade, packaging, and specification are subject to daily availability and quotation confirmation.",
    shopSummary: "Browse products by category, add items to cart, and submit a purchase enquiry.",
    templateEyebrow: "Company Information",
    pending: "Confirm by email",
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
  | "join-us"
  | "customer-application"
  | "supplier-application"
  | "shop";

function getPublicPage(): PublicPage {
  switch (window.location.pathname) {
    case "/company":
      return "company";
    case "/product-range":
      return "product-range";
    case "/join-us":
    case "/contact":
      return "join-us";
    case "/customer-application":
      return "customer-application";
    case "/supplier-application":
      return "supplier-application";
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
  const isCustomerApplication = page === "customer-application";
  const isPartnershipApplication =
    isCustomerApplication || page === "supplier-application";
  const showShop = ENABLE_ONLINE_SHOP && page === "shop";
  const activeCompanyModule = companyProfileModules.find(
    (module) => module.slug === page,
  );
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [activeBusinessIndex, setActiveBusinessIndex] = useState(0);
  const copy = uiCopy[language];
  const activeBusinessScope = homeBusinessScopes[activeBusinessIndex];
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
  const [partnershipSubmitState, setPartnershipSubmitState] = useState<
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

  // 合作申请通过 Netlify Forms 提交，客户与供应商数据分别归档。
  async function handlePartnershipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const encodedData = new URLSearchParams();

    formData.forEach((value, key) => {
      encodedData.append(key, String(value));
    });
    setPartnershipSubmitState("sending");

    try {
      const response = await fetch("/api/partnership-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(formData.entries()),
          applicationType: isCustomerApplication ? "customer" : "supplier",
        }),
      });

      if (!response.ok) {
        throw new Error("Partnership form submission failed");
      }

      // 邮件发送成功后再同步到 Netlify Forms，便于在控制台保留申请记录。
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodedData.toString(),
      }).catch(() => undefined);

      form.reset();
      setPartnershipSubmitState("sent");
    } catch {
      setPartnershipSubmitState("error");
    }
  }

  return (
    <main>
      <section
        className={`top-band ${isHome ? "home-band" : isPartnershipApplication ? "application-top-band" : "inner-band"} ${page === "company" ? "company-profile-band" : page === "product-range" ? "product-range-band" : page === "join-us" ? "join-us-band" : ""}`}
      >
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
            <a className={isHome ? "active" : ""} href="/">
              {copy.homeLabel}
            </a>
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

        {isPartnershipApplication ? null : isHome ? (
          <div className="hero hero-home">
            <div className="hero-media-placeholder">
              {/* 背景视频必须静音才能在主流手机和桌面浏览器中自动播放。 */}
              <video
                className="hero-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
              >
                <source
                  src="/videos/fruit-vegetable-hero.mp4"
                  type="video/mp4"
                />
              </video>
            </div>
            <div className="hero-overlay">
              <div className="hero-copy">
                <p className="hero-wordmark">TIAN YI</p>
                <h1>{copy.heroTitle}</h1>
              </div>
              <div className="hero-proof-grid" aria-label={copy.homeOverviewLabel}>
                {homeStats.map((stat) => (
                  <div className="hero-proof-card" key={stat.value}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label[language]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`hero hero-inner ${page === "company" ? "company-profile-hero" : page === "product-range" ? "product-range-hero" : page === "join-us" ? "join-us-hero" : ""}`}
          >
            {page === "company" ? (
              <h1>{copy.aboutUsTitle}</h1>
            ) : page === "product-range" ? (
              <h1>{copy.productRangeHeroTitle}</h1>
            ) : page === "join-us" ? (
              <h1>{activeCompanyModule?.title[language]}</h1>
            ) : (
              <>
                <p className="eyebrow">TIAN YI INTERNATIONAL TRADING PTE. LTD</p>
                <h1>{activeCompanyModule?.title[language] ?? copy.heroTitle}</h1>
                <p>{activeCompanyModule?.summary[language] ?? copy.heroDescription}</p>
              </>
            )}
          </div>
        )}
      </section>

      {isPartnershipApplication && (
        <section
          className="partnership-application-page"
          aria-labelledby="partnership-application-title"
        >
          <header className="partnership-application-heading">
            {isCustomerApplication ? (
              <UsersRound size={66} strokeWidth={1.9} aria-hidden="true" />
            ) : (
              <Truck size={66} strokeWidth={1.9} aria-hidden="true" />
            )}
            <h1 id="partnership-application-title">
              {isCustomerApplication
                ? language === "zh"
                  ? "成为 TIAN YI 的客户"
                  : "Become a TIAN YI Customer"
                : language === "zh"
                  ? "成为 TIAN YI 的供应商"
                  : "Become a TIAN YI Supplier"}
            </h1>
            <p>
              {isCustomerApplication
                ? language === "zh"
                  ? "想了解更多关于 TIAN YI 的食品与厨房用品供应服务？请填写以下资料，让我们与您联系。"
                  : "Want to learn more about TIAN YI's food and kitchen supply services? Complete the form and our team will contact you."
                : language === "zh"
                  ? "希望与 TIAN YI 建立稳定的供应合作？请填写以下资料，让我们进一步了解您的产品与供货能力。"
                  : "Interested in building a stable supply partnership with TIAN YI? Tell us about your products and supply capabilities."}
            </p>
          </header>

          {partnershipSubmitState === "sent" ? (
            <div className="partnership-form-result" role="status">
              <CheckCircle2 size={48} aria-hidden="true" />
              <h2>{language === "zh" ? "提交成功" : "Application Submitted"}</h2>
              <p>
                {language === "zh"
                  ? "感谢您提交资料，TIAN YI 工作人员会在审核后与您联系。"
                  : "Thank you. The TIAN YI team will review your details and contact you."}
              </p>
              <a href="/join-us">
                {language === "zh" ? "返回加入我们" : "Back to Join Us"}
              </a>
            </div>
          ) : (
            <form
              className="partnership-form"
              name={
                isCustomerApplication
                  ? "customer-partnership"
                  : "supplier-partnership"
              }
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              onSubmit={handlePartnershipSubmit}
            >
              <input
                type="hidden"
                name="form-name"
                value={
                  isCustomerApplication
                    ? "customer-partnership"
                    : "supplier-partnership"
                }
              />
              <input
                type="hidden"
                name="applicationType"
                value={isCustomerApplication ? "customer" : "supplier"}
              />
              <label className="hidden-field">
                Do not fill this out
                <input name="bot-field" />
              </label>

              <label>
                <span><b>*</b>{language === "zh" ? "公司名称" : "Company Name"}</span>
                <input
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  placeholder={language === "zh" ? "请输入" : "Enter company name"}
                  required
                />
              </label>

              {isCustomerApplication ? (
                <label>
                  <span><b>*</b>{language === "zh" ? "公司类型" : "Company Type"}</span>
                  <select name="companyType" defaultValue="" required>
                    <option value="" disabled>{language === "zh" ? "请选择" : "Select an option"}</option>
                    <option value="restaurant">{language === "zh" ? "餐厅或餐饮企业" : "Restaurant or F&B business"}</option>
                    <option value="hotel-canteen">{language === "zh" ? "酒店或食堂" : "Hotel or canteen"}</option>
                    <option value="shipping">{language === "zh" ? "船运公司" : "Shipping company"}</option>
                    <option value="retail">{language === "zh" ? "零售或超市" : "Retail or supermarket"}</option>
                    <option value="other">{language === "zh" ? "其他" : "Other"}</option>
                  </select>
                </label>
              ) : (
                <label>
                  <span><b>*</b>{language === "zh" ? "供应品类" : "Supply Category"}</span>
                  <select name="supplierCategory" defaultValue="" required>
                    <option value="" disabled>{language === "zh" ? "请选择" : "Select an option"}</option>
                    <option value="produce">{language === "zh" ? "水果与蔬菜" : "Fruit and vegetables"}</option>
                    <option value="meat-seafood">{language === "zh" ? "肉类与海鲜" : "Meat and seafood"}</option>
                    <option value="dry-goods">{language === "zh" ? "调味品与干货" : "Seasonings and dry goods"}</option>
                    <option value="kitchen-supplies">{language === "zh" ? "厨房用品" : "Kitchen supplies"}</option>
                    <option value="other">{language === "zh" ? "其他" : "Other"}</option>
                  </select>
                </label>
              )}

              <label>
                <span><b>*</b>{language === "zh" ? "地址" : "Address"}</span>
                <input
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  placeholder={language === "zh" ? "请输入" : "Enter address"}
                  required
                />
              </label>

              <label>
                <span><b>*</b>{language === "zh" ? "您的姓名" : "Your Name"}</span>
                <input
                  name="contactName"
                  type="text"
                  autoComplete="name"
                  placeholder={language === "zh" ? "请输入" : "Enter your name"}
                  required
                />
              </label>

              <label>
                <span><b>*</b>{language === "zh" ? "电话号码" : "Phone Number"}</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={language === "zh" ? "请输入" : "Enter phone number"}
                  required
                />
              </label>

              <label>
                <span>
                  <b>*</b>
                  {isCustomerApplication
                    ? language === "zh" ? "月采购金额" : "Estimated Monthly Purchase"
                    : language === "zh" ? "可供应区域" : "Supply Region"}
                </span>
                <input
                  name={isCustomerApplication ? "monthlyPurchase" : "supplyRegion"}
                  type="text"
                  placeholder={
                    isCustomerApplication
                      ? language === "zh" ? "例如：SGD 5,000" : "For example: SGD 5,000"
                      : language === "zh" ? "例如：新加坡、中国、马来西亚" : "For example: Singapore, China, Malaysia"
                  }
                  required
                />
              </label>

              <label>
                <span><b>*</b>{language === "zh" ? "电子邮箱" : "Email Address"}</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={language === "zh" ? "请输入" : "Enter email address"}
                  required
                />
              </label>

              {partnershipSubmitState === "error" && (
                <p className="partnership-form-error" role="alert">
                  {language === "zh"
                    ? "暂时无法提交，请稍后重试或发送邮件至 tianyi011224@gmail.com。"
                    : "Unable to submit right now. Please try again or email tianyi011224@gmail.com."}
                </p>
              )}

              <button
                className="partnership-submit-button"
                type="submit"
                disabled={partnershipSubmitState === "sending"}
              >
                {partnershipSubmitState === "sending"
                  ? language === "zh" ? "提交中..." : "Submitting..."
                  : language === "zh" ? "提交" : "Submit"}
              </button>
            </form>
          )}
        </section>
      )}

      {isHome && (
        <>
          <section className="home-company-section" aria-labelledby="home-company-title">
            <header className="home-company-heading">
              <h2 id="home-company-title">{copy.homeIntroTitle}</h2>
              <p>{copy.homeIntroText}</p>
            </header>
            <div className="home-company-grid">
              {homeCompanyHighlights.map((item) => (
                <article className="home-company-card" key={item.label.zh}>
                  <img src={item.image} alt="" />
                  <div>
                    <strong>{item.value[language]}</strong>
                    <span>{item.label[language]}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="home-business-section" aria-labelledby="home-business-title">
            <h2 id="home-business-title">{copy.homeBusinessTitle}</h2>
            <div className="home-business-tabs" role="tablist" aria-label={copy.homeBusinessTitle}>
              {homeBusinessScopes.map((item, index) => (
                <button
                  className={index === activeBusinessIndex ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={index === activeBusinessIndex}
                  onClick={() => setActiveBusinessIndex(index)}
                  key={item.tab.zh}
                >
                  {item.tab[language]}
                </button>
              ))}
            </div>
            <div className="home-business-carousel">
              <button
                className="business-arrow previous"
                type="button"
                title={copy.homeBusinessPrev}
                aria-label={copy.homeBusinessPrev}
                onClick={() =>
                  setActiveBusinessIndex((current) =>
                    (current - 1 + homeBusinessScopes.length) % homeBusinessScopes.length,
                  )
                }
              >
                <ChevronLeft size={30} aria-hidden="true" />
              </button>
              <article className="home-business-panel">
                <img src={activeBusinessScope.image} alt="" />
                <div>
                  <h3>{activeBusinessScope.title[language]}</h3>
                  <p>{activeBusinessScope.text[language]}</p>
                </div>
              </article>
              <button
                className="business-arrow next"
                type="button"
                title={copy.homeBusinessNext}
                aria-label={copy.homeBusinessNext}
                onClick={() =>
                  setActiveBusinessIndex((current) =>
                    (current + 1) % homeBusinessScopes.length,
                  )
                }
              >
                <ChevronRight size={30} aria-hidden="true" />
              </button>
            </div>
            <a className="home-business-contact" href="mailto:tianyi011224@gmail.com">
              {copy.homeBusinessContact}
            </a>
          </section>

          <section className="home-section">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">{copy.homeServicesEyebrow}</p>
                <h2>{copy.homeServicesTitle}</h2>
              </div>
            </div>
            <div className="home-service-grid">
              {homeServices.map((service) => {
                const Icon = service.icon;
                return (
                  <article className="home-service-card" key={service.title.zh}>
                    <span>
                      <Icon size={23} aria-hidden="true" />
                    </span>
                    <h3>{service.title[language]}</h3>
                    <p>{service.text[language]}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="home-split-section">
            <div>
              <p className="eyebrow">{copy.homeProductsEyebrow}</p>
              <h2>{copy.homeProductsTitle}</h2>
              <div className="home-tag-list">
                {homeProductGroups.map((item) => (
                  <span key={item.zh}>{item[language]}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">{copy.homeClientsEyebrow}</p>
              <h2>{copy.homeClientsTitle}</h2>
              <div className="home-tag-list">
                {homeClientGroups.map((item) => (
                  <span key={item.zh}>{item[language]}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="home-contact-band">
            <div>
              <h2>{copy.homeContactTitle}</h2>
              <p>{copy.homeContactText}</p>
            </div>
            <a className="primary-link" href="mailto:tianyi011224@gmail.com">
              {copy.homeContactButton}
              <ChevronRight size={18} aria-hidden="true" />
            </a>
          </section>

          <section className="home-partners-section" aria-labelledby="home-partners-title">
            <h2 id="home-partners-title">{copy.homePartnersTitle}</h2>
            <div className="home-partners-window" aria-label={copy.homePartnersLabel}>
              {homePartnerRows.map((partnerRow, rowIndex) => (
                <div className="home-partners-marquee" key={rowIndex}>
                  <div className="home-partners-track">
                    {[0, 1].map((groupIndex) => (
                      <div
                        className="home-partners-group"
                        aria-hidden={groupIndex === 1}
                        key={groupIndex}
                      >
                        {partnerRow.map((partner) => (
                          <div
                            className={`home-partner-item ${partner.logoClass}`}
                            key={partner.name.zh}
                          >
                            <img src={partner.logo} alt={partner.name[language]} loading="lazy" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeCompanyModule && (
        <>
      {activeCompanyModule.slug === "company" ? (
        <>
          <section
            className="company-profile-section"
            id="company"
            aria-labelledby="company-title"
          >
            <article className="company-profile-panel">
              <h2 id="company-title">{activeCompanyModule.title[language]}</h2>
              {activeCompanyModule.content?.[language].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          </section>
          <section className="company-purpose-section" aria-label={copy.aboutUsTitle}>
            <div className="company-purpose-grid">
              {companyPurposeCards.map((card) => (
                <article className="company-purpose-card" key={card.title.zh}>
                  <h2>{card.title[language]}</h2>
                  {card.body ? <p>{card.body[language]}</p> : null}
                  {card.items ? (
                    <ul>
                      {card.items.map((item) => (
                        <li key={item.zh}>{item[language]}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
          <section className="company-source-section" aria-labelledby="company-source-title">
            <header className="company-source-heading">
              <p className="eyebrow">SOURCE &amp; QUALITY</p>
              <h2 id="company-source-title">
                {language === "zh" ? "优质产地，鲜达新加坡" : "Quality Origins, Freshly Supplied to Singapore"}
              </h2>
              <p>
                {language === "zh"
                  ? "以下为可根据季节、市场供应及客户需求组织的常见采购产区示例。每批产品的实际产地、品牌、等级与规格，以报价和订单确认结果为准。"
                  : "These are examples of common sourcing regions that may be arranged according to season, market availability, and customer requirements. Actual origin, brand, grade, and specification are confirmed with each quotation and order."}
              </p>
            </header>
            <div className="company-source-grid">
              {companySourceHighlights.map((item) => (
                <article className="company-source-card" key={item.origin.zh}>
                  <img src={item.image} alt="" loading="lazy" />
                  <div>
                    <span>{item.origin[language]}</span>
                    <h3>{item.products[language]}</h3>
                    <p>{item.benefit[language]}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : activeCompanyModule.slug === "product-range" ? (
        <>
          <section
            className="product-range-section"
            id="product-range"
            aria-labelledby="product-range-title"
          >
            <div className="product-range-panel">
              <header>
                <h2 id="product-range-title">{copy.productRangePanelTitle}</h2>
                <p>{copy.productRangeIntro}</p>
                <small>{copy.productRangeNote}</small>
              </header>
              <div className="product-range-catalog">
                {productRangeCatalog.map((item) => (
                  <article className="product-range-item" key={item.name.zh}>
                    <img src={item.image} alt="" loading="lazy" />
                    <h3>{item.name[language]}</h3>
                  </article>
                ))}
              </div>
            </div>
          </section>
          <section className="supply-chain-section" aria-labelledby="supply-chain-title">
            <h2 id="supply-chain-title">
              {language === "zh" ? "供应链服务" : "Supply Chain Services"}
            </h2>
            <div className="supply-chain-grid">
              {supplyChainServices.map((service) => (
                <article className="supply-chain-card" key={service.title.zh}>
                  <img src={service.image} alt="" loading="lazy" />
                  <div>
                    <h3>{service.title[language]}</h3>
                    <p>{service.text[language]}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : activeCompanyModule.slug === "join-us" ? (
      <>
        <section
          className="join-us-section"
          id="join-us"
          aria-labelledby="join-us-title"
        >
          <div className="join-us-panel">
            <h2 className="sr-only" id="join-us-title">
              {activeCompanyModule.title[language]}
            </h2>
            <div className="join-us-grid">
              {activeCompanyModule.fields.map((field) => (
                <article className="join-us-detail" key={field.zh}>
                  <h3>{field[language]}</h3>
                  <p>{field.value?.[language] ?? copy.pending}</p>
                </article>
              ))}
            </div>
            {activeCompanyModule.cta && (
              <a
                className="join-us-cta"
                href={`mailto:tianyi011224@gmail.com?subject=${encodeURIComponent(
                  language === "zh"
                    ? "应聘 TIAN YI"
                    : "Application to Join TIAN YI",
                )}`}
              >
                {activeCompanyModule.cta[language]}
                <ChevronRight size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        </section>

        <section
          className="join-us-partner-section"
          aria-labelledby="join-us-partner-title"
        >
          <div className="join-us-partner-inner">
            <h2 id="join-us-partner-title">
              {language === "zh" ? "成为我们的合作伙伴" : "Partner with Us"}
            </h2>
            <div className="join-us-partner-grid">
              <a
                className="join-us-partner-card"
                href="/customer-application"
              >
                <Handshake size={52} strokeWidth={1.8} aria-hidden="true" />
                <strong>
                  {language === "zh"
                    ? "成为 TIAN YI 的客户"
                    : "Become a TIAN YI Customer"}
                  <ChevronRight size={18} aria-hidden="true" />
                </strong>
                <span>
                  {language === "zh"
                    ? "一站式食品与厨房用品采购"
                    : "One-stop food and kitchen supply"}
                </span>
              </a>
              <a
                className="join-us-partner-card"
                href="/supplier-application"
              >
                <Truck size={52} strokeWidth={1.8} aria-hidden="true" />
                <strong>
                  {language === "zh"
                    ? "成为 TIAN YI 的供应商"
                    : "Become a TIAN YI Supplier"}
                  <ChevronRight size={18} aria-hidden="true" />
                </strong>
                <span>
                  {language === "zh"
                    ? "携手拓展稳定、长期的供应合作"
                    : "Build stable, long-term supply partnerships"}
                </span>
              </a>
            </div>
          </div>
        </section>
      </>
      ) : (
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
                      <span>{field.value?.[language] ?? copy.pending}</span>
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
      )}
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

      {/* 公共页脚：所有公开页面共用，后台管理页面不会渲染此区域。 */}
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand-column">
            <a className="footer-wordmark" href="/" aria-label="TIAN YI">
              TIAN YI
            </a>
            <span className="footer-company-name">
              INTERNATIONAL TRADING PTE. LTD
            </span>
            <div className="footer-qr-grid">
              {/* 当前使用图标作为二维码占位；接入真实图片时在配置项增加 src，并改用 img 渲染。 */}
              {[
                { label: copy.footerWhatsapp, className: "whatsapp" },
                { label: copy.footerWechat, className: "wechat" },
              ].map((item) => (
                <div className="footer-qr-item" key={item.className}>
                  <span className={`footer-qr-placeholder ${item.className}`}>
                    <QrCode size={76} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
            <p className="footer-copyright">{copy.footerCopyright}</p>
          </div>

          {/* 页脚仅保留主要访问入口，完整栏目仍可通过顶部导航进入。 */}
          <nav className="footer-nav" aria-label={copy.navLabel}>
            <a href="/">{copy.homeLabel}</a>
            {companyProfileModules
              .filter((module) =>
                ["company", "product-range", "join-us"].includes(module.slug),
              )
              .map((module) => (
                <a href={`/${module.slug}`} key={module.slug}>
                  {module.title[language]}
                </a>
              ))}
          </nav>

          {/* 联系按钮使用 mailto，无需额外脚本即可调用访客设备的默认邮件应用。 */}
          <div className="footer-contact">
            <h2>{copy.footerContactTitle}</h2>
            <h3>{copy.footerOfficeTitle}</h3>
            <p>{copy.footerAddress}</p>
            <p>{copy.footerPhone}</p>
            <p>{copy.footerBusinessEmail}</p>
            <a href="mailto:tianyi011224@gmail.com">
              {copy.footerContactButton}
            </a>
          </div>
        </div>
      </footer>

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
