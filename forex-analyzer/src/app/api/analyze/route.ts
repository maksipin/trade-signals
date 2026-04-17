import { NextRequest, NextResponse } from 'next/server';
import { analyzePairsAndSendSignals } from '@/lib/telegram';

// Forex валютные пары для анализа (majors)
// Формат символов для Finnhub API: EURUSD, GBPUSD и т.д.
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
      FOREX_PAIRS,
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
