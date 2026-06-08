export const productCatalog = Object.freeze([
  {
    id: "apple-fuji",
    name: "\u5c71\u4e1c\u7ea2\u5bcc\u58eb\u82f9\u679c",
    category: "\u6c34\u679c",
    price: 18.8,
    unit: "\u65a4",
  },
  {
    id: "orange-navel",
    name: "\u8d63\u5357\u8110\u6a59",
    category: "\u6c34\u679c",
    price: 16.9,
    unit: "\u65a4",
  },
  {
    id: "banana",
    name: "\u9ad8\u5c71\u9999\u8549",
    category: "\u6c34\u679c",
    price: 9.8,
    unit: "\u65a4",
  },
  {
    id: "strawberry",
    name: "\u7cbe\u54c1\u8349\u8393",
    category: "\u6c34\u679c",
    price: 28.8,
    unit: "\u76d2",
  },
  {
    id: "tomato",
    name: "\u6c99\u74e4\u756a\u8304",
    category: "\u852c\u83dc",
    price: 7.9,
    unit: "\u65a4",
  },
  {
    id: "lettuce",
    name: "\u6709\u673a\u751f\u83dc",
    category: "\u852c\u83dc",
    price: 6.6,
    unit: "\u9897",
  },
  {
    id: "broccoli",
    name: "\u897f\u5170\u82b1",
    category: "\u852c\u83dc",
    price: 8.8,
    unit: "\u9897",
  },
  {
    id: "carrot",
    name: "\u80e1\u841d\u535c",
    category: "\u852c\u83dc",
    price: 5.2,
    unit: "\u65a4",
  },
  {
    id: "family-box",
    name: "\u4e09\u65e5\u5bb6\u5ead\u9c9c\u98df\u7bb1",
    category: "\u7ec4\u5408\u5957\u9910",
    price: 89,
    unit: "\u7bb1",
  },
  {
    id: "office-box",
    name: "\u529e\u516c\u5ba4\u6c34\u679c\u8865\u7ed9\u7bb1",
    category: "\u7ec4\u5408\u5957\u9910",
    price: 128,
    unit: "\u7bb1",
  },
]);

const productById = new Map(productCatalog.map((product) => [product.id, product]));

export function getCatalogProductById(productId) {
  return productById.get(String(productId || "").trim()) || null;
}
