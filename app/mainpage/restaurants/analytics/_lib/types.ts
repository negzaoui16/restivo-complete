export type AnalyticsPeriod = "today" | "7d" | "30d" | "month" | "year";

export type AnalyticsTabType = "overview" | "stock" | "ml_ai" | "accounting" | "engineering";

export type StockCategory =
  | "viandes"
  | "produits_laitiers"
  | "boulangerie"
  | "legumes_fruits"
  | "epicerie_sauces"
  | "boissons"
  | "emballages";

export type StockStatus = "ok" | "low" | "critical";

export interface StockItem {
  id: string;
  name: string;
  category: StockCategory;
  quantity: number;
  unit: "kg" | "g" | "L" | "ml" | "pcs";
  minThreshold: number;
  costPerUnit: number; // In DT (TND)
  supplier: string;
  lastRestocked: string;
  status: StockStatus;
  usedInDishesCount: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: "in" | "out_sale" | "loss" | "adjustment";
  quantity: number;
  unit: string;
  cost: number;
  reason?: string;
  date: string;
}

export interface DishRecipe {
  dishId: string;
  dishName: string;
  category: string;
  sellingPrice: number;
  foodCost: number; // Calculated from ingredients
  marginDT: number;
  marginPercent: number;
  ingredients: {
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: "loyer" | "salaires" | "energie_eau" | "fournisseurs" | "marketing" | "autre";
  amount: number; // in DT
  date: string;
  paymentMethod: "especes" | "virement" | "cheque" | "carte";
  status: "paye" | "en_attente";
  notes?: string;
}

export interface DailyCashClosure {
  id: string;
  date: string;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  onlineSales: number;
  cashInRegister: number;
  cashDiscrepancy: number; // Difference (+ or -)
  closedBy: string;
  status: "conforme" | "ecart";
}

export interface MenuEngineeringItem {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  foodCost: number;
  unitMargin: number;
  volumeSold: number;
  totalRevenue: number;
  totalProfit: number;
  classification: "star" | "plowhorse" | "puzzle" | "dog";
}

export interface MLPredictionResult {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  currentStock: number;
  minThreshold: number;
  costPerUnit: number;
  supplier: string;
  r2Score: number;
  weights: {
    intercept: number;
    dayOfWeekWeight: number;
    peakRushWeight: number;
    rollingAvgWeight: number;
    trendWeight: number;
  };
  predictedNext3Days: number;
  predictedDaily: {
    dayName: string;
    predictedQty: number;
  }[];
  safetyStock: number;
  suggestedReorderQty: number;
  estimatedCost: number;
  urgency: "critique" | "eleve" | "modere" | "securise";
  recommendationReason: string;
}

export interface RealAnalyticsApiResponse {
  restaurantId: string;
  restaurantName: string;
  isSeeded: boolean;
  metrics: {
    totalRevenue: number;
    ordersCount: number;
    averageTicket: number;
    foodCost: number;
    foodCostPercent: number;
    grossMargin: number;
    grossMarginPercent: number;
    netProfit: number;
  };
  weeklySales: {
    day: string;
    date: string;
    revenue: number;
    orderCount: number;
  }[];
  channelDistribution: {
    dineIn: { percent: number; amount: number };
    takeaway: { percent: number; amount: number };
    delivery: { percent: number; amount: number };
  };
  paymentDistribution: {
    cash: { percent: number; amount: number };
    card: { percent: number; amount: number };
    online: { percent: number; amount: number };
  };
  topDishes: MenuEngineeringItem[];
  mlPredictions: MLPredictionResult[];
}
