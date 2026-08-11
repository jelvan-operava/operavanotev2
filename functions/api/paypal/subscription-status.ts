import { getPayPalSubscriptionStatus, isPayPalConfigured } from '../../_shared/paypal';

type Env = {
  DB: D1Database;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENV?: string;
  PAYPAL_BASE_URL?: string;
  APP_URL?: string;
};

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (!isPayPalConfigured(env)) {
    return Response.json({ error: 'PayPal is not configured.' }, { status: 503 });
  }

  const url = new URL(request.url);
  const subscriptionId = url.searchParams.get('subscription_id');

  if (!subscriptionId) {
    return Response.json({ error: 'subscription_id is required.' }, { status: 400 });
  }

  try {
    const result = await getPayPalSubscriptionStatus(env, subscriptionId);
    return Response.json({ success: true, ...result });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || 'Failed to read PayPal subscription status.' },
      { status: 500 },
    );
  }
}
