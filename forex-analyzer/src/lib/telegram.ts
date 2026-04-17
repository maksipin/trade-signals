import { Candle, Signal } from '@/types';
import finnhub from 'finnhub';

// Инициализация клиента Finnhub
const getFinnhubClient = () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY не установлен. Получите бесплатный ключ на https://finnhub.io/');
  }
  
  return new finnhub.DefaultApi(apiKey);
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
 * Получает данные свечей с Finnhub API (бесплатный источник данных для Forex)
 * Finnhub предоставляет исторические данные по валютным парам Форекс
 * Бесплатный тариф: 60 запросов/минуту, данные в реальном времени
 * Регистрация: https://finnhub.io/
 */
export async function fetchCandles(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  try {
    const finnhubClient = getFinnhubClient();
    
    // Преобразуем интервал в формат Finnhub
    // Finnhub поддерживает: D (день), W (неделя), M (месяц) для REST API
    // Для внутридневных данных используем параметр resolution в минутах
    let finnhubResolution: string;
    switch (interval) {
      case '1h':
        finnhubResolution = '60'; // 60 минут = 1 час
        break;
      case '1d':
        finnhubResolution = 'D';
        break;
      case '4h':
        finnhubResolution = '240'; // 240 минут = 4 часа
        break;
      default:
        finnhubResolution = '60';
    }
    
    // Формат символа для Finnhub Forex: OANDA:EUR_USD
    const forexSymbol = `OANDA:${symbol.replace('/', '_')}`;
    
    // Вычисляем временной диапазон для получения нужного количества свечей
    const endTime = Math.floor(Date.now() / 1000);
    let startTime: number;
    
    // В зависимости от интервала вычисляем start time
    if (interval === '1d') {
      // Для дневных свечей берем последние limit дней
      startTime = endTime - (limit * 24 * 60 * 60);
    } else {
      // Для часовых свечей берем последние limit часов
      startTime = endTime - (limit * 60 * 60);
    }
    
    // Используем промисификацию для forexCandles
    const candlesData = await new Promise<any>((resolve, reject) => {
      finnhubClient.forexCandles(forexSymbol, finnhubResolution, startTime, endTime, (error: any, data: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
    
    // Finnhub возвращает объект: { s: 'ok', c: [close], o: [open], h: [high], l: [low], t: [timestamp], v: [volume] }
    if (!candlesData || candlesData.s !== 'ok' || !candlesData.c || candlesData.c.length === 0) {
      console.warn(`Нет данных для ${symbol} от Finnhub API`);
      return [];
    }
    
    // Преобразуем данные в формат Candle
    const candles: Candle[] = [];
    for (let i = 0; i < candlesData.c.length; i++) {
      candles.push({
        time: candlesData.t[i] * 1000, // Finnhub возвращает timestamp в секундах
        open: candlesData.o[i],
        high: candlesData.h[i],
        low: candlesData.l[i],
        close: candlesData.c[i],
      });
    }
    
    return candles;
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
