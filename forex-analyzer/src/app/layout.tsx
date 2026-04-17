import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forex Analyzer - Автоматический анализ валютных пар',
  description: 'Приложение для анализа цен валютных пар на форексе и отправки сигналов в Telegram',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
