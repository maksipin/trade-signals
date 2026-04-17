import { NextRequest, NextResponse } from 'next/server';
import { analyzePairsAndSendSignals } from '@/lib/telegram';

// Forex валютные пары для анализа (majors)
const FOREX_PAIRS = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'AUD/USD',
  'USD/CAD',
  'USD/CHF',
  'NZD/USD',
  'EUR/GBP',
  'EUR/JPY',
  'GBP/JPY',
];

/**
 * API endpoint для обработки webhook от Telegram бота
 * POST /api/telegram
 * 
 * Поддерживаемые команды:
 * - /start - запуск анализа и получение результатов
 * - /signals - получение последних сигналов
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Проверяем, что это сообщение от Telegram
    if (!body.message || !body.message.chat) {
      return NextResponse.json({ error: 'Invalid Telegram update' }, { status: 400 });
    }

    const chatId = body.message.chat.id.toString();
    const text = body.message.text;

    // Игнорируем сообщения без текста
    if (!text) {
      return NextResponse.json({ ok: true });
    }

    // Обрабатываем команду /start или /signals
    if (text === '/start' || text === '/signals') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        await sendTelegramMessage(
          chatId,
          '❌ Ошибка: Бот не настроен. Отсутствует TELEGRAM_BOT_TOKEN'
        );
        return NextResponse.json({ ok: true });
      }

      // Отправляем сообщение о начале анализа
      await sendTelegramMessage(
        chatId,
        '🔍 Начинаю анализ валютных пар...\nПожалуйста, подождите.'
      );

      try {
        const signals = await analyzePairsAndSendSignals(
          FOREX_PAIRS,
          botToken,
          chatId
        );

        // Отправляем итоговый отчет
        let summaryMessage = `✅ Анализ завершен!\n\n`;
        
        if (signals.length > 0) {
          summaryMessage += `🎯 Найдено сигналов: ${signals.length}\n\n`;
          signals.forEach((signal, index) => {
            const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
            summaryMessage += `${index + 1}. ${emoji} ${signal.action} ${signal.pair}\n`;
          });
        } else {
          summaryMessage += `😴 Сигналов не найдено.\n`;
          summaryMessage += `Все пары проанализированы, но текущие условия не соответствуют критериям входа.`;
        }

        summaryMessage += `\n\n⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}`;

        await sendTelegramMessage(chatId, summaryMessage);

        return NextResponse.json({
          ok: true,
          analysisComplete: true,
          signalsCount: signals.length,
          signals: signals.map(s => ({
            pair: s.pair,
            action: s.action,
            timestamp: s.timestamp.toISOString(),
          })),
        });
      } catch (error) {
        console.error('Ошибка при анализе:', error);
        await sendTelegramMessage(
          chatId,
          `❌ Произошла ошибка при анализе:\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
        );
        
        return NextResponse.json({
          ok: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        }, { status: 500 });
      }
    }

    // Если команда не распознана
    if (text.startsWith('/')) {
      await sendTelegramMessage(
        chatId,
        `❓ Неизвестная команда: ${text}\n\nДоступные команды:\n/start - Запустить анализ\n/signals - Получить последние сигналы`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ошибка обработки Telegram webhook:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Вспомогательная функция для отправки сообщений в Telegram
 */
async function sendTelegramMessage(chatId: string, message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN не установлен');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    await fetch(url, {
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
  } catch (error) {
    console.error('Ошибка отправки сообщения в Telegram:', error);
  }
}
