import { NextRequest, NextResponse } from 'next/server';
import { analyzePairsAndSendSignals } from '@/lib/telegram';

// Крипто-пары для демонстрации (работают с Binance API)
const CRYPTO_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
];

/**
 * API endpoint для ручного запуска анализа
 * GET /api/analyze
 */
export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return NextResponse.json(
      { 
        error: 'Telegram credentials not configured',
        message: 'Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables'
      },
      { status: 500 }
    );
  }

  try {
    console.log('🚀 Запуск анализа через API...');
    
    const signals = await analyzePairsAndSendSignals(
      CRYPTO_PAIRS,
      botToken,
      chatId
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      signalsCount: signals.length,
      signals: signals.map(s => ({
        pair: s.pair,
        action: s.action,
        timestamp: s.timestamp.toISOString(),
      })),
      message: signals.length > 0 
        ? `Найдено сигналов: ${signals.length}` 
        : 'Сигналов не найдено'
    });
  } catch (error) {
    console.error('Ошибка при анализе:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
