import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Globe2,
  Leaf,
  Minus,
  PackageCheck,
  Plus,
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
  };
  packingSlipHtml: string;
  invoiceHtml: string;
  email?: {
    sent: boolean;
    reason?: string;
  };
};

const CART_STORAGE_KEY = "ty-shop-cart";
const ALL_CATEGORY = "全部";

const companyStats = [
  { value: "多渠道", label: "供应资源整合" },
  { value: "全流程", label: "询价、备货、配送跟进" },
  { value: "B2B+B2C", label: "企业与家庭订单兼顾" },
  { value: "可追踪", label: "订单确认与交付反馈" },
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
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

function App() {
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
        encodedData.append(key, String(value));
      });
      encodedData.append("orderNumber", orderResult.order.orderNumber);
      encodedData.append("packingSlipHtml", orderResult.packingSlipHtml);
      encodedData.append("invoiceHtml", orderResult.invoiceHtml);
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
            aria-label="TIAN YI INTERNATIONAL TRADING PTE. LTD 首页"
          >
            <span className="brand-mark">
              <Leaf size={24} aria-hidden="true" />
            </span>
            <span>
              <strong>TIAN YI</strong>
              <small>International Trading</small>
            </span>
          </a>
          <nav className="site-nav" aria-label="主要导航">
            <a href="#company">公司实力</a>
            <a href="#services">服务能力</a>
            <a href="#products">在线选购</a>
          </nav>
          <button
            className="cart-button"
            type="button"
            onClick={() => setIsCartOpen(true)}
            title="打开购物车"
            aria-label={`打开购物车，当前 ${itemCount} 件商品`}
          >
            <ShoppingBasket size={21} aria-hidden="true" />
            <span>{itemCount}</span>
          </button>
        </header>

        <div className="hero">
          <div className="hero-copy">
            <p className="eyebrow">TIAN YI INTERNATIONAL TRADING PTE. LTD</p>
            <h1>天一国际贸易</h1>
            <p>
              面向家庭、办公室、社区客户和企业采购需求，提供精选食品、生鲜与日常消费品供应服务。我们从货源组织、订单确认到配送跟进形成闭环，让采购更可靠、更省心。
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#company">
                了解公司实力
                <ChevronRight size={18} aria-hidden="true" />
              </a>
              <a className="secondary-link" href="#products">
                在线选购
              </a>
            </div>
          </div>
          <div className="hero-image" aria-label="食品供应与贸易服务">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
              alt="摆满蔬菜水果的生鲜货架"
            />
            <div className="hero-badge">
              <BadgeCheck size={19} aria-hidden="true" />
              <span>供应整合 · 订单确认 · 配送跟进</span>
            </div>
          </div>
        </div>
      </section>

      <section className="company-section" id="company" aria-labelledby="company-title">
        <div className="company-copy">
          <p className="eyebrow">关于公司</p>
          <h2 id="company-title">以贸易资源整合能力服务本地采购需求</h2>
          <p>
            TIAN YI INTERNATIONAL TRADING PTE. LTD
            关注食品、生鲜及日常消费品领域的供应组织和客户交付。网站现已支持商品展示、分类选购、购物车和订单意向提交，便于客户快速表达采购需求，也便于公司对订单进行统一确认和跟进。
          </p>
          <p>
            公司介绍不只停留在“卖商品”，而是强调从供应端筛选、价格沟通、规格确认、订单记录到配送反馈的完整服务能力。无论是家庭日常补给、办公室水果、企业福利，还是社区小批量采购，都可以通过线上入口快速建立沟通。
          </p>
        </div>
        <div className="stats-grid" aria-label="公司能力概览">
          {companyStats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="strength-section" aria-label="核心优势">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">核心优势</p>
            <h2>更像合作伙伴，而不只是线上货架</h2>
          </div>
        </div>
        <div className="strength-grid">
          {strengths.map((item) => {
            const Icon = item.icon;
            return (
              <article className="strength-card" key={item.title}>
                <span className="strength-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="service-section" id="services" aria-labelledby="service-title">
        <div className="service-copy">
          <p className="eyebrow">服务能力</p>
          <h2 id="service-title">从需求到交付的流程化服务</h2>
          <p>
            我们把客户下单后的沟通环节前置到流程中：先确认需求，再确认供应和配送，减少临时缺货、规格不一致和沟通遗漏。
          </p>
          <div className="flow-list" aria-label="服务流程">
            {serviceFlow.map((step, index) => (
              <div className="flow-item" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="scene-panel">
          <div className="scene-panel-header">
            <BarChart3 size={24} aria-hidden="true" />
            <h3>适用采购场景</h3>
          </div>
          <div className="scene-tags">
            {serviceScenes.map((scene) => (
              <span key={scene}>{scene}</span>
            ))}
          </div>
          <div className="delivery-note">
            <Truck size={18} aria-hidden="true" />
            提交订单意向后，工作人员会确认库存、配送与付款安排
          </div>
        </div>
      </section>

      <section className="shop-section" id="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">在线选购</p>
            <h2>精选商品与组合采购</h2>
          </div>
          <div className="category-tabs" aria-label="商品分类">
            {categories.map((category) => (
              <button
                key={category}
                className={category === activeCategory ? "active" : ""}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="product-grid">
          {visibleProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                <img src={product.image} alt={product.name} />
                {product.featured && <span>推荐</span>}
              </div>
              <div className="product-body">
                <div>
                  <p className="category-label">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                </div>
                <div className="product-footer">
                  <strong>
                    {formatCurrency(product.price)}
                    <small> / {product.unit}</small>
                  </strong>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    title={`加入购物车：${product.name}`}
                    aria-label={`加入购物车：${product.name}`}
                  >
                    <Plus size={18} aria-hidden="true" />
                    加入
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="assurance-section" aria-label="服务承诺">
        <div>
          <PackageCheck size={24} aria-hidden="true" />
          <strong>按需备货</strong>
          <span>根据订单需求确认规格、数量和替换方案。</span>
        </div>
        <div>
          <Store size={24} aria-hidden="true" />
          <strong>多场景供应</strong>
          <span>支持家庭、办公室、社区和企业福利采购。</span>
        </div>
        <div>
          <UsersRound size={24} aria-hidden="true" />
          <strong>人工跟进</strong>
          <span>订单提交后由工作人员完成确认与沟通。</span>
        </div>
      </section>

      <aside className={`cart-panel ${isCartOpen ? "open" : ""}`}>
        <div className="cart-header">
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsCartOpen(false)}
            title="收起购物车"
            aria-label="收起购物车"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div>
            <p className="eyebrow">购物车</p>
            <h2>{itemCount} 件商品</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsCartOpen(false)}
            title="关闭购物车"
            aria-label="关闭购物车"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {cartLines.length === 0 ? (
          <div className="empty-cart">
            {submitState === "sent" ? (
              <>
                <CheckCircle2 size={42} aria-hidden="true" />
                <h3>订单意向已提交</h3>
                <p>
                  {lastOrderNumber
                    ? `订单编号：${lastOrderNumber}。`
                    : ""}
                  工作人员收到后会尽快联系你确认配送和付款。
                </p>
              </>
            ) : submitState === "error" ? (
              <>
                <ShoppingBasket size={42} aria-hidden="true" />
                <h3>提交失败</h3>
                <p>请检查网络后重新提交，或直接联系工作人员下单。</p>
              </>
            ) : (
              <>
                <ShoppingBasket size={42} aria-hidden="true" />
                <h3>购物车还是空的</h3>
                <p>先挑几样适合的商品或组合套餐吧。</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {cartLines.map((line) => (
                <div className="cart-line" key={line.product.id}>
                  <img src={line.product.image} alt={line.product.name} />
                  <div className="cart-line-info">
                    <strong>{line.product.name}</strong>
                    <span>
                      {formatCurrency(line.product.price)} / {line.product.unit}
                    </span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.product.id, line.quantity - 1)
                        }
                        title="减少数量"
                        aria-label={`减少 ${line.product.name} 数量`}
                      >
                        <Minus size={15} aria-hidden="true" />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.product.id, line.quantity + 1)
                        }
                        title="增加数量"
                        aria-label={`增加 ${line.product.name} 数量`}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <button
                    className="remove-button"
                    type="button"
                    onClick={() => updateQuantity(line.product.id, 0)}
                    title="移除商品"
                    aria-label={`移除 ${line.product.name}`}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <span>订单合计</span>
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
                value="TIAN YI INTERNATIONAL TRADING PTE. LTD 新订单"
              />
              <p className="hidden-field">
                <label>
                  不要填写：
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
                姓名
                <input
                  name="customerName"
                  type="text"
                  placeholder="联系人姓名"
                  autoComplete="name"
                  required
                />
              </label>
              <label>
                电话或邮箱
                <input
                  name="contact"
                  type="text"
                  placeholder="用于确认订单"
                  autoComplete="tel"
                  required
                />
              </label>
              <label>
                配送地址
                <input
                  name="address"
                  type="text"
                  placeholder="小区、街道或详细地址"
                  autoComplete="street-address"
                  required
                />
              </label>
              <label>
                备注
                <textarea
                  name="notes"
                  placeholder="配送时间、采购用途、替换偏好等"
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
                  清空
                </button>
                <button
                  className="submit-button"
                  type="submit"
                  disabled={submitState === "sending"}
                >
                  {submitState === "sending" ? "提交中" : "提交订单意向"}
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          </>
        )}
      </aside>

      {isCartOpen && (
        <button
          className="cart-backdrop"
          type="button"
          aria-label="关闭购物车遮罩"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      <button
        className="mobile-cart-bar"
        type="button"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingBasket size={20} aria-hidden="true" />
        <span>{itemCount} 件</span>
        <strong>{formatCurrency(orderTotal)}</strong>
      </button>
    </main>
  );
}

export default App;
