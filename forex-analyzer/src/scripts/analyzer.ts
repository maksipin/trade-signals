/**
 * Скрипт для анализа валютных пар и отправки сигналов в Telegram
 * Запускается каждые 10 минут до окончания часа (в :50)
 * 
 * Использование:
 * npm run analyze
 * 
 * Переменные окружения:
 * - TELEGRAM_BOT_TOKEN: токен вашего Telegram бота
 * - TELEGRAM_CHAT_ID: ID чата для отправки сообщений
 */

import { analyzePairsAndSendSignals } from '@/lib/telegram';

// Список валютных пар для анализа (используем крипто-пары как пример)
// Для реального Forex замените на соответствующие символы вашего API провайдера
const FOREX_PAIRS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'USDCHF',
  'NZDUSD',
  'EURGBP',
  'EURJPY',
  'GBPJPY',
];

// Крипто-пары для демонстрации (работают с Binance API)
const CRYPTO_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
];

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Ошибка: Не установлены переменные окружения TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
    console.log('Для запуска создайте файл .env со следующими значениями:');
    console.log('TELEGRAM_BOT_TOKEN=your_bot_token');
    console.log('TELEGRAM_CHAT_ID=your_chat_id');
    process.exit(1);
  }

  console.log('🚀 Запуск анализа валютных пар...');
  console.log(`Время: ${new Date().toLocaleString('ru-RU')}`);
  console.log(`Анализируемые пары: ${CRYPTO_PAIRS.join(', ')}`);

  try {
    const signals = await analyzePairsAndSendSignals(
      CRYPTO_PAIRS,
      botToken,
      chatId
    );

    if (signals.length === 0) {
      console.log('✅ Сигналов не найдено');
    } else {
      console.log(`📊 Найдено сигналов: ${signals.length}`);
      signals.forEach(signal => {
        console.log(`  - ${signal.pair}: ${signal.action}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при анализе:', error);
    process.exit(1);
  }
}

main();
