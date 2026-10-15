import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  return NextResponse.json({
    ok: Boolean(botToken && chatId),
    configured: Boolean(botToken && chatId),
    message: botToken && chatId
      ? 'Telegram alerting is configured and ready to send messages.'
      : 'Telegram alerting is not configured yet. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel.'
  });
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const configuredChatId = process.env.TELEGRAM_CHAT_ID;
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  const chatId = String(payload.chatId || configuredChatId || '').trim();

  if (!botToken) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_BOT_TOKEN is missing. Add it in Vercel.' },
      { status: 500 }
    );
  }

  if (!chatId) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_CHAT_ID is missing. Add it in Vercel.' },
      { status: 500 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { ok: false, error: 'No alert text was provided.' },
      { status: 400 }
    );
  }

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });

  const data = await telegramResponse.json().catch(() => ({ ok: false }));

  if (!telegramResponse.ok || !data.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: data.description || 'Telegram rejected the request.',
        details: data
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, data });
}
