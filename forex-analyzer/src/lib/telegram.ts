import { Candle, Signal } from '@/types';
import TwelveData from 'twelvedata';

// Инициализация клиента Twelve Data
const getTwelveDataClient = () => {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error('TWELVEDATA_API_KEY не установлен. Получите бесплатный ключ на https://twelvedata.com/');
  }
  
  return TwelveData({ key: apiKey });
};

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
 * Получает данные свечей с Twelve Data API (бесплатный источник данных для Forex)
 * Twelve Data предоставляет исторические данные по валютным парам Форекс
 * Бесплатный тариф: 800 запросов/день, данные в реальном времени
 * Регистрация: https://twelvedata.com/
 */
export async function fetchCandles(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  try {
    const twelveDataClient = getTwelveDataClient();
    
    // Преобразуем интервал в формат Twelve Data
    // Twelve Data поддерживает: 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
    let twelveDataInterval: string;
    switch (interval) {
      case '1h':
        twelveDataInterval = '1h';
        break;
      case '1d':
        twelveDataInterval = '1day';
        break;
      case '4h':
        twelveDataInterval = '4h';
        break;
      default:
        twelveDataInterval = '1h';
    }
    
    // Формат символа для Twelve Data Forex: EUR/USD
    const forexSymbol = symbol;
    
    // Получаем данные через time_series endpoint
    const response = await twelveDataClient.timeSeries({
      symbol: forexSymbol,
      interval: twelveDataInterval,
      outputsize: limit,
      format: 'JSON',
    });
    
    // Twelve Data возвращает объект с метаданными и массивом значений
    if (!response || !response.values || response.values.length === 0) {
      console.warn(`Нет данных для ${symbol} от Twelve Data API`);
      return [];
    }
    
    // Преобразуем данные в формат Candle
    const candles: Candle[] = [];
    for (const item of response.values) {
      candles.push({
        time: new Date(item.datetime).getTime(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
      });
    }
    
    // Twelve Data возвращает данные в обратном порядке (новые сначала), разворачиваем
    return candles.reverse();
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
