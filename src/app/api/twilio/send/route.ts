import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { to, body } = await request.json().catch(() => ({ to: '', body: '' }));

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Twilio env vars are missing. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.'
      },
      { status: 500 }
    );
  }

  if (!to || !body) {
    return NextResponse.json(
      { ok: false, error: 'Missing required fields: to and body.' },
      { status: 400 }
    );
  }

  const twilioResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: String(to),
        From: from,
        Body: String(body)
      })
    }
  );

  const text = await twilioResponse.text();

  if (!twilioResponse.ok) {
    return NextResponse.json(
      { ok: false, error: 'Twilio rejected the request.', details: text },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ ok: true, data: JSON.parse(text) });
  } catch {
    return NextResponse.json({ ok: true, raw: text });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Twilio SMS route ready. Add env vars to enable live sending.'
  });
}
