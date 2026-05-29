import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { categories, Product, ProductCategory, products } from "./products";

type CartLine = {
  product: Product;
  quantity: number;
};

type CartState = Record<string, number>;

const CART_STORAGE_KEY = "ty-shop-cart";
const ALL_CATEGORY = "全部";

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
    setIsCartOpen(true);
  }

  function clearCart() {
    setCart({});
    setSubmitState("idle");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (itemCount === 0) {
      setIsCartOpen(true);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const encodedData = new URLSearchParams();
    formData.forEach((value, key) => {
      encodedData.append(key, String(value));
    });
    setSubmitState("sending");

    try {
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodedData.toString(),
      });
      window.localStorage.removeItem(CART_STORAGE_KEY);
      form.reset();
      setCart({});
      setSubmitState("sent");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <main>
      <section className="top-band">
        <header className="site-header">
          <a className="brand" href="/" aria-label="每日鲜达首页">
            <span className="brand-mark">
              <Leaf size={24} aria-hidden="true" />
            </span>
            <span>
              <strong>每日鲜达</strong>
              <small>Fresh Market</small>
            </span>
          </a>
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
            <p className="eyebrow">当日优选 · 社区配送 · 到货再确认</p>
            <h1>每日鲜达</h1>
            <p>
              新鲜蔬菜、水果和家庭组合套餐，一站式加入购物车。留下联系方式后，店主会确认配送时间、库存和付款方式。
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#products">
                开始选购
                <ChevronRight size={18} aria-hidden="true" />
              </a>
              <span className="delivery-note">
                <Truck size={18} aria-hidden="true" />
                满 59 元同城配送
              </span>
            </div>
          </div>
          <div className="hero-image" aria-label="新鲜水果蔬菜">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
              alt="摆满蔬菜水果的生鲜货架"
            />
          </div>
        </div>
      </section>

      <section className="shop-section" id="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">今日上架</p>
            <h2>挑选新鲜好物</h2>
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
                <p>店主收到后会尽快联系你确认配送和付款。</p>
              </>
            ) : submitState === "error" ? (
              <>
                <ShoppingBasket size={42} aria-hidden="true" />
                <h3>提交失败</h3>
                <p>请检查网络后重新提交，或直接联系店主下单。</p>
              </>
            ) : (
              <>
                <ShoppingBasket size={42} aria-hidden="true" />
                <h3>购物车还是空的</h3>
                <p>先挑几样今日新鲜好物吧。</p>
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
                  placeholder="收货人姓名"
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
                  placeholder="配送时间、替换偏好、发票等"
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
