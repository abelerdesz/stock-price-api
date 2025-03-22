export interface StockMovingAverageResponse {
  price: number;
  movingAverage: number;
  updatedAt: Date;
}

export type StockSymbol = string;
