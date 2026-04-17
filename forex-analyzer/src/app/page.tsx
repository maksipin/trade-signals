'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    signalsCount: number;
    timestamp?: string;
  } | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze');
      const data = await response.json();
      setResult({
        success: data.success,
        message: data.message,
        signalsCount: data.signalsCount,
        timestamp: data.timestamp,
      });
    } catch (error) {
      setResult({
        success: false,
        message: 'Ошибка при выполнении анализа',
        signalsCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold text-white">
          📊 Forex Analyzer
        </h1>
        
        <p className="text-gray-300 text-lg">
          Автоматический анализ валютных пар и отправка сигналов в Telegram
        </p>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            🔍 Анализ рынка
          </h2>
          
          <p className="text-gray-400 mb-6">
            Скрипт проверяет каждую пару за 10 минут до окончания часа.
            <br />
            Если последняя дневная свеча и последние 2 часовых свечи одного цвета,
            отправляется сигнал в Telegram.
          </p>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {loading ? '⏳ Анализ...' : '🚀 Запустить анализ'}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-900/50 border border-green-700' 
                : 'bg-red-900/50 border border-red-700'
            }`}>
              <p className={`text-lg font-semibold ${
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.success ? '✅ Успешно' : '❌ Ошибка'}
              </p>
              <p className="text-white mt-2">{result.message}</p>
              {result.signalsCount !== undefined && (
                <p className="text-gray-300 mt-1">
                  Найдено сигналов: {result.signalsCount}
                </p>
              )}
              {result.timestamp && (
                <p className="text-gray-400 text-sm mt-2">
                  Время: {new Date(result.timestamp).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            ⚙️ Настройка
          </h2>
          
          <div className="text-left space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Создайте Telegram бота:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Откройте @BotFather в Telegram</li>
                <li>Отправьте команду /newbot</li>
                <li>Следуйте инструкциям для получения токена</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">2. Получите Chat ID:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Добавьте бота в чат или канал</li>
                <li>Отправьте сообщение в чат</li>
                <li>Используйте API для получения ID или специальные боты</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">3. Настройте переменные окружения:</h3>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">4. Запустите планировщик:</h3>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
{`# В crontab добавьте (запуск в :50 каждого часа):
50 * * * * cd /path/to/forex-analyzer && npm run analyze`}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            📋 Логика работы
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
              <h3 className="font-semibold text-green-400 mb-2">🟢 BUY сигнал</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Дневная свеча: зеленая</li>
                <li>• Часовая свеча 1: зеленая</li>
                <li>• Часовая свеча 2: зеленая</li>
              </ul>
            </div>

            <div className="bg-red-900/30 p-4 rounded-lg border border-red-700">
              <h3 className="font-semibold text-red-400 mb-2">🔴 SELL сигнал</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Дневная свеча: красная</li>
                <li>• Часовая свеча 1: красная</li>
                <li>• Часовая свеча 2: красная</li>
              </ul>
            </div>
          </div>
        </div>

        <footer className="text-gray-500 text-sm">
          <p>⚠️ Это автоматический инструмент. Проводите собственный анализ перед торговлей.</p>
        </footer>
      </div>
    </main>
  );
}
