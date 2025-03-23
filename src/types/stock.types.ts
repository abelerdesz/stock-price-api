export interface StockMovingAverageResponse {
  price: number;
  movingAverage: number;
  updatedAt: Date;
}

export interface StockPriceData {
  price: number;
  publishedAt: Date;
  accessedAt: Date;
}
