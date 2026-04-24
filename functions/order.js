// Cloudflare Pages Function for /api/order
// Required bindings in Cloudflare Pages / Wrangler config:
//   - ORDER_KV (KV namespace)
//   - SENDGRID_API_KEY (secret) for email notifications
//   - SENDGRID_FROM_EMAIL (secret) sender address
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');

  if (!orderId) {
    return new Response(JSON.stringify({ message: 'Missing orderId query parameter.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.ORDER_KV) {
    return new Response(JSON.stringify({ message: 'ORDER_KV binding not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const stored = await env.ORDER_KV.get(orderId);
  if (!stored) {
    return new Response(JSON.stringify({ message: 'Order not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(stored, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ORDER_KV) {
    return new Response(JSON.stringify({ message: 'ORDER_KV binding not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let order;
  try {
    order = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const now = new Date().toISOString();
  const orderId = order.orderId || `QINGLAN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const existingRaw = order.orderId ? await env.ORDER_KV.get(orderId) : null;
  const existingOrder = existingRaw ? JSON.parse(existingRaw) : null;
  const createdAt = existingOrder?.createdAt || now;
  const savedOrder = {
    orderId,
    plan: order.plan,
    amount: order.amount,
    status: order.status || 'pending',
    fullName: order.fullName,
    email: order.email,
    country: order.country,
    propertyType: order.propertyType,
    sizeBand: order.sizeBand,
    notes: order.notes,
    paypalOrderId: order.paypalOrderId || existingOrder?.paypalOrderId || null,
    captureTime: order.captureTime || existingOrder?.captureTime || null,
    createdAt,
    updatedAt: now
  };

  await env.ORDER_KV.put(orderId, JSON.stringify(savedOrder));

  if (savedOrder.status === 'completed') {
    sendConfirmationEmail(savedOrder, env).catch((error) => {
      console.error('Failed to send confirmation email:', error);
    });
  }

  return new Response(JSON.stringify(savedOrder), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendConfirmationEmail(order, env) {
  const apiKey = env.SENDGRID_API_KEY;
  const sender = env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !sender) {
    console.warn('SendGrid not configured. Skipping confirmation email.');
    return;
  }

  if (!order.email) {
    console.warn('Order has no email address. Cannot send confirmation email.');
    return;
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: order.email }],
        subject: `Your Qinglan Feng Shui order ${order.orderId} is confirmed`
      }
    ],
    from: { email: sender, name: 'Qinglan Global Feng Shui' },
    content: [
      {
        type: 'text/plain',
        value: `Hello ${order.fullName || 'customer'},\n\n` +
          `Thank you for your order. Here are your order details:\n` +
          `Order ID: ${order.orderId}\n` +
          `Plan: ${order.plan}\n` +
          `Amount: ${order.amount}\n` +
          `PayPal Order ID: ${order.paypalOrderId || 'N/A'}\n` +
          `Created: ${order.createdAt}\n\n` +
          `We will contact you with the next steps.\n\n` +
          `Best regards,\nQinglan Global Feng Shui`
      }
    ]
  };

  await fetch(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
