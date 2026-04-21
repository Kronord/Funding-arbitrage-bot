import TelegramBot from 'node-telegram-bot-api';
import type { FundingPair } from '@funding-monitor/types';

const token  = process.env.TELEGRAM_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || '';

const bot = token ? new TelegramBot(token, { polling: false }) : null;

export async function sendTelegramReport(pairs: FundingPair[], now: string) {
  if (!bot || !chatId || !pairs.length) return;

  const escape = (s: string | number) =>
    String(s).replace(/[.\-+()]/g, '\\$&');

  let msg = `📊 *ТОП\\-25 З ПЛЮСОВИМ ФАНДИНГОМ*\n🕐 _${now}_\n\n`;

  pairs.forEach((p, i) => {
    const emoji = p.net > 0 ? '✅' : '⚠️';
    msg += `*${i + 1}\\. ${p.coin}*\n`;
    msg += `💸 Фандинг: \`${escape(p.funding)}%\` \\| ⏱ ${escape(p.intervalHours)}г\n`;
    msg += `🕐 Виплата: ${p.nextFundingTime ?? '—'} \\(через ${p.minutesUntil} хв\\)\n`;
    msg += `📈 Спред: \`${escape(p.basisReal)}%\`\n`;
    msg += `${emoji} Чистий: \`${escape(p.net)}%\`\n\n`;
  });

  try {
    await bot.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' });
  } catch (e) {
    console.error('Telegram error:', e);
  }
}