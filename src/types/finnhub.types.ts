export interface FinnhubQuoteResponse {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // high price of the day
  l: number; // low price of the day
  o: number; // open price
  pc: number; // previous close price
  t: number; // timestamp
}
