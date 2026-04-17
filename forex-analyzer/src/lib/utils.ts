import { Candle, Signal } from '@/types';

/**
 * Определяет цвет свечи (зеленая или красная)
 */
export function getCandleColor(candle: Candle): 'GREEN' | 'RED' {
  return candle.close >= candle.open ? 'GREEN' : 'RED';
}

/**
 * Проверяет условия для сигнала на покупку или продажу
 * - BUY: последняя дневная свеча зеленая И последние 2 часовых свечи зеленые
 * - SELL: последняя дневная свеча красная И последние 2 часовых свечи красные
 */
export function checkSignal(
  dailyCandles: Candle[],
  hourlyCandles: Candle[]
): Signal | null {
  if (dailyCandles.length < 1 || hourlyCandles.length < 2) {
    return null;
  }

  const lastDailyCandle = dailyCandles[dailyCandles.length - 1];
  const lastHourlyCandle = hourlyCandles[hourlyCandles.length - 1];
  const secondLastHourlyCandle = hourlyCandles[hourlyCandles.length - 2];

  const dailyColor = getCandleColor(lastDailyCandle);
  const lastHourlyColor = getCandleColor(lastHourlyCandle);
  const secondLastHourlyColor = getCandleColor(secondLastHourlyCandle);

  // Проверка на покупку: все свечи зеленые
  if (
    dailyColor === 'GREEN' &&
    lastHourlyColor === 'GREEN' &&
    secondLastHourlyColor === 'GREEN'
  ) {
    return {
      pair: '', // Будет заполнено при вызове
      action: 'BUY',
      timestamp: new Date(),
      dailyCandleColor: 'GREEN',
      hourlyCandlesColor: 'GREEN',
    };
  }

  // Проверка на продажу: все свечи красные
  if (
    dailyColor === 'RED' &&
    lastHourlyColor === 'RED' &&
    secondLastHourlyColor === 'RED'
  ) {
    return {
      pair: '', // Будет заполнено при вызове
      action: 'SELL',
      timestamp: new Date(),
      dailyCandleColor: 'RED',
      hourlyCandlesColor: 'RED',
    };
  }

  return null;
}

/**
 * Форматирует сообщение для отправки в Telegram
 */
export function formatSignalMessage(signal: Signal): string {
  const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
  const actionText = signal.action === 'BUY' ? 'ПОКУПКА' : 'ПРОДАЖА';
  
  return `
${emoji} ${actionText} ${signal.pair}

📊 Анализ свечей:
• Дневная свеча: ${signal.dailyCandleColor === 'GREEN' ? '🟢 Зеленая' : '🔴 Красная'}
• Часовые свечи: ${signal.hourlyCandlesColor === 'GREEN' ? '🟢 Зеленые' : '🔴 Красные'} (последние 2)

⏰ Время сигнала: ${signal.timestamp.toLocaleString('ru-RU')}

💡 Это автоматический сигнал. Проведите собственный анализ перед торговлей!
  `.trim();
}
