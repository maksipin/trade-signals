export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Signal {
  pair: string;
  action: 'BUY' | 'SELL';
  timestamp: Date;
  dailyCandleColor: 'GREEN' | 'RED';
  hourlyCandlesColor: 'GREEN' | 'RED';
}

export type Timeframe = 'D' | '60';
