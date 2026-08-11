type PayPalEnv = {
  DB: D1Database;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENV?: string;
  PAYPAL_BASE_URL?: string;
  APP_URL?: string;
};

export type PayPalPlanKey = 'pro' | 'enterprise';

export type PayPalPlanConfig = {
  key: PayPalPlanKey;
  name: string;
  description: string;
  price: string;
};

const TRIAL_DAYS = 10;

const PLAN_CONFIGS: Record<PayPalPlanKey, PayPalPlanConfig> = {
  pro: {
    key: 'pro',
    name: 'Bolek Workspace Pro',
    description: 'Pro plan with a 10-day free trial, then monthly billing.',
    price: '9.99',
  },
  enterprise: {
    key: 'enterprise',
    name: 'Bolek Workspace Enterprise',
    description: 'Enterprise plan with a 10-day free trial, then monthly billing.',
    price: '29.99',
  },
};

export function getPayPalBaseUrl(env: PayPalEnv) {
  if (env.PAYPAL_BASE_URL) return env.PAYPAL_BASE_URL;
  return env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function ensureSettingsTable(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS paypal_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getSetting(db: D1Database, key: string) {
  await ensureSettingsTable(db);
  const row = await db.prepare('SELECT value FROM paypal_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value || null;
}

async function setSetting(db: D1Database, key: string, value: string) {
  await ensureSettingsTable(db);
  await db.prepare(`
    INSERT INTO paypal_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).bind(key, value).run();
}

async function getAccessToken(env: PayPalEnv) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal client credentials are not configured.');
  }

  const response = await fetch(`${getPayPalBaseUrl(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed: ${await response.text()}`);
  }

  const data = await response.json<{ access_token?: string }>();
  if (!data.access_token) throw new Error('PayPal access token missing from response.');
  return data.access_token;
}

async function paypalRequest(env: PayPalEnv, path: string, init: RequestInit = {}) {
  const token = await getAccessToken(env);
  return fetch(getPayPalBaseUrl(env) + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function getPlanConfig(planKey: string) {
  return PLAN_CONFIGS[planKey as PayPalPlanKey] || null;
}

export function isPayPalConfigured(env: PayPalEnv) {
  return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

export async function ensurePayPalBootstrap(env: PayPalEnv) {
  const existingProductId = await getSetting(env.DB, 'paypal_product_id');
  if (existingProductId) return existingProductId;

  const productResponse = await paypalRequest(env, '/v1/catalogs/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bolek Workspace',
      description: 'Subscription product for Bolek Workspace.',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  if (!productResponse.ok) {
    throw new Error(`PayPal product creation failed: ${await productResponse.text()}`);
  }

  const product = await productResponse.json<{ id?: string }>();
  if (!product.id) throw new Error('PayPal product id missing from response.');

  await setSetting(env.DB, 'paypal_product_id', product.id);
  return product.id;
}

export async function ensurePayPalPlan(env: PayPalEnv, planKey: PayPalPlanKey) {
  const planConfig = PLAN_CONFIGS[planKey];
  const cachedPlanId = await getSetting(env.DB, `paypal_plan_${planKey}`);
  if (cachedPlanId) return cachedPlanId;

  const productId = await ensurePayPalBootstrap(env);
  const planResponse = await paypalRequest(env, '/v1/billing/plans', {
    method: 'POST',
    body: JSON.stringify({
      product_id: productId,
      name: planConfig.name,
      description: planConfig.description,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: 'DAY', interval_count: TRIAL_DAYS },
          tenure_type: 'TRIAL',
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: {
            fixed_price: { value: '0', currency_code: 'USD' },
          },
        },
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 2,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: planConfig.price, currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!planResponse.ok) {
    throw new Error(`PayPal plan creation failed: ${await planResponse.text()}`);
  }

  const plan = await planResponse.json<{ id?: string }>();
  if (!plan.id) throw new Error('PayPal plan id missing from response.');

  await setSetting(env.DB, `paypal_plan_${planKey}`, plan.id);
  return plan.id;
}

export async function createPayPalSubscription(
  env: PayPalEnv,
  planKey: PayPalPlanKey,
  subscriberEmail?: string,
  origin?: string,
) {
  const planId = await ensurePayPalPlan(env, planKey);
  const baseUrl = (origin || env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const returnUrl = `${baseUrl}/desk?paypal=return&plan=${planKey}`;
  const cancelUrl = `${baseUrl}/desk?paypal=cancel&plan=${planKey}`;

  const response = await paypalRequest(env, '/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      ...(subscriberEmail ? { subscriber: { email_address: subscriberEmail } } : {}),
      application_context: {
        brand_name: 'Bolek Workspace',
        user_action: 'SUBSCRIBE_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PayPal subscription creation failed: ${await response.text()}`);
  }

  const subscription = await response.json<{ id?: string; links?: Array<{ rel?: string; href?: string }> }>();
  const approvalUrl = subscription.links?.find((link) => link.rel === 'approve')?.href || null;
  if (!subscription.id || !approvalUrl) {
    throw new Error('PayPal subscription approval link missing from response.');
  }

  return {
    subscriptionId: subscription.id,
    approvalUrl,
    trialDays: TRIAL_DAYS,
    planKey,
  };
}

export async function getPayPalSubscriptionStatus(env: PayPalEnv, subscriptionId: string) {
  const response = await paypalRequest(env, `/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`PayPal subscription lookup failed: ${await response.text()}`);
  }

  const subscription = await response.json<{
    id?: string;
    status?: string;
    plan_id?: string;
    billing_info?: { next_billing_time?: string };
    subscriber?: { email_address?: string };
  }>();

  return {
    subscriptionId: subscription.id || subscriptionId,
    status: subscription.status || 'UNKNOWN',
    planId: subscription.plan_id || null,
    trialEndsAt: subscription.billing_info?.next_billing_time || null,
    subscriberEmail: subscription.subscriber?.email_address || null,
  };
}
