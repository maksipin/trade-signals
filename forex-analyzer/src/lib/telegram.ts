import { Candle, Signal } from '@/types';

/**
 * Отправляет сообщение в Telegram бот
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('Ошибка отправки в Telegram:', await response.text());
      return false;
    }

    const result = await response.json();
    console.log('Сообщение отправлено в Telegram:', result.ok);
    return result.ok;
  } catch (error) {
    console.error('Ошибка при отправке в Telegram:', error);
    return false;
  }
}

/**
 * Получает данные свечей с Binance API (бесплатный источник данных)
 * Binance предоставляет исторические данные по криптовалютным парам,
 * но также можно использовать для forex-пар через другие API
 */
export async function fetchCandles(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  try {
    // Используем Binance API как пример (для крипто-пар)
    // Для реального Forex нужно использовать специализированный API
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Преобразуем данные в формат Candle
    // Binance возвращает: [time, open, high, low, close, volume, ...]
    return data.map((item: any[]) => ({
      time: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
    }));
  } catch (error) {
    console.error(`Ошибка получения данных для ${symbol}:`, error);
    return [];
  }
}

/**
 * Проверяет валютные пары и отправляет сигналы
 */
export async function analyzePairsAndSendSignals(
  pairs: string[],
  botToken: string,
  chatId: string
): Promise<Signal[]> {
  const signals: Signal[] = [];

  for (const pair of pairs) {
    try {
      // Получаем дневные свечи (1d)
      const dailyCandles = await fetchCandles(pair, '1d', 5);
      
      // Получаем часовые свечи (1h)
      const hourlyCandles = await fetchCandles(pair, '1h', 10);

      if (dailyCandles.length === 0 || hourlyCandles.length < 2) {
        console.log(`Недостаточно данных для ${pair}`);
        continue;
      }

      // Проверяем условия для сигнала
      const signal = checkSignalForPair(dailyCandles, hourlyCandles, pair);

      if (signal) {
        signals.push(signal);
        
        // Форматируем и отправляем сообщение
        const message = formatSignalMessage(signal);
        await sendTelegramMessage(botToken, chatId, message);
        
        console.log(`Сигнал для ${pair}: ${signal.action}`);
      }
    } catch (error) {
      console.error(`Ошибка анализа пары ${pair}:`, error);
    }
  }

  return signals;
}

/**
 * Вспомогательная функция для проверки сигнала конкретной пары
 */
function checkSignalForPair(
  dailyCandles: Candle[],
  hourlyCandles: Candle[],
  pair: string
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
      pair,
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
      pair,
      action: 'SELL',
      timestamp: new Date(),
      dailyCandleColor: 'RED',
      hourlyCandlesColor: 'RED',
    };
  }

  return null;
}

/**
 * Определяет цвет свечи
 */
function getCandleColor(candle: Candle): 'GREEN' | 'RED' {
  return candle.close >= candle.open ? 'GREEN' : 'RED';
}

/**
 * Форматирует сообщение для Telegram
 */
function formatSignalMessage(signal: Signal): string {
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
