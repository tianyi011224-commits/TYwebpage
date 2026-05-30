export type ProductCategory = "水果" | "蔬菜" | "组合套餐";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: string;
  image: string;
  description: string;
  featured: boolean;
};

export const categories: Array<"全部" | ProductCategory> = [
  "全部",
  "水果",
  "蔬菜",
  "组合套餐",
];

export const products: Product[] = [
  {
    id: "apple-fuji",
    name: "山东红富士苹果",
    category: "水果",
    price: 18.8,
    unit: "斤",
    image:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80",
    description: "清甜脆爽，产地分级供应，适合家庭、办公室与礼盒组合。",
    featured: true,
  },
  {
    id: "orange-navel",
    name: "赣南脐橙",
    category: "水果",
    price: 16.9,
    unit: "斤",
    image:
      "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=900&q=80",
    description: "果汁充足，酸甜平衡，按批次筛选并安排新鲜配送。",
    featured: true,
  },
  {
    id: "banana",
    name: "高山香蕉",
    category: "水果",
    price: 9.8,
    unit: "斤",
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80",
    description: "自然熟化，口感绵密，适合日常补给和团体采购。",
    featured: false,
  },
  {
    id: "strawberry",
    name: "精品草莓",
    category: "水果",
    price: 28.8,
    unit: "盒",
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=80",
    description: "颗粒饱满，果香明显，适合高品质鲜果订单。",
    featured: false,
  },
  {
    id: "tomato",
    name: "沙瓤番茄",
    category: "蔬菜",
    price: 7.9,
    unit: "斤",
    image:
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
    description: "适合凉拌、煮汤和家常炒菜，批量采购可提前确认规格。",
    featured: true,
  },
  {
    id: "lettuce",
    name: "有机生菜",
    category: "蔬菜",
    price: 6.6,
    unit: "颗",
    image:
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=900&q=80",
    description: "叶片鲜嫩，适合沙拉、轻食门店与家庭日常餐桌。",
    featured: false,
  },
  {
    id: "broccoli",
    name: "西兰花",
    category: "蔬菜",
    price: 8.8,
    unit: "颗",
    image:
      "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=900&q=80",
    description: "花球紧实，适合餐饮备货、家庭配送和健康餐组合。",
    featured: false,
  },
  {
    id: "carrot",
    name: "胡萝卜",
    category: "蔬菜",
    price: 5.2,
    unit: "斤",
    image:
      "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=900&q=80",
    description: "耐储存、易搭配，适合长期稳定采购与组合配送。",
    featured: false,
  },
  {
    id: "family-box",
    name: "三日家庭鲜食箱",
    category: "组合套餐",
    price: 89,
    unit: "箱",
    image:
      "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=900&q=80",
    description: "含多款水果和蔬菜，适合 2-3 人家庭的周期性补给。",
    featured: true,
  },
  {
    id: "office-box",
    name: "办公室水果补给箱",
    category: "组合套餐",
    price: 128,
    unit: "箱",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80",
    description: "多种易分食水果组合，适合企业下午茶和团队福利。",
    featured: false,
  },
];
