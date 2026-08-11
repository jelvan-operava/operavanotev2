import { createPayPalSubscription, getPlanConfig, isPayPalConfigured } from '../../_shared/paypal';

type Env = {
  DB: D1Database;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENV?: string;
  PAYPAL_BASE_URL?: string;
  APP_URL?: string;
};

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!isPayPalConfigured(env)) {
    return Response.json({ error: 'PayPal is not configured.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const planKey = String(body?.plan || 'pro');
  const planConfig = getPlanConfig(planKey);

  if (!planConfig) {
    return Response.json({ error: 'Invalid PayPal plan.' }, { status: 400 });
  }

  try {
    const result = await createPayPalSubscription(
      env,
      planConfig.key,
      body?.email ? String(body.email) : undefined,
      request.headers.get('origin') || env.APP_URL,
    );

    return Response.json({
      success: true,
      ...result,
      plan: planConfig,
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || 'Failed to create PayPal subscription.' },
      { status: 500 },
    );
  }
}
