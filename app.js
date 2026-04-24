const page = document.body.dataset.page;
const BACKEND_ORDER_URL = '/api/order';

const plans = {
  starter: {
    title: 'Starter Compass Report',
    price: 'USD 79.00',
    amount: '79.00'
  },
  signature: {
    title: 'Signature Spatial Audit',
    price: 'USD 189.00',
    amount: '189.00'
  },
  business: {
    title: 'Business Flow Blueprint',
    price: 'USD 329.00',
    amount: '329.00'
  }
};

let currentPlan = 'signature';
let paypalButtons = null;
let paymentSubmitted = false;
let backendOrder = null;

window.addEventListener('DOMContentLoaded', () => {
  setYear();
  setActiveNav();
  initPlanButtons();
  initHashScroll();
  initPayPalButtons();
});

function setYear() {
  const yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }
}

function setActiveNav() {
  const current = document.querySelector(`[data-nav="${page}"]`);
  if (current) {
    current.classList.add('active');
  }
}

function initPlanButtons() {
  const buttons = document.querySelectorAll('[data-select-plan]');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      currentPlan = button.dataset.selectPlan;
      updatePlanSummary(currentPlan);

      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
      }
      paymentSubmitted = false;
      backendOrder = null;
      initPayPalButtons();

      window.location.hash = button.dataset.selectPlan;
    });
  });
}

async function submitOrderToBackend(payload) {
  const response = await fetch(BACKEND_ORDER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to save order to backend.');
  }

  return response.json();
}

function showCheckoutError(message) {
  const errorMessage = document.getElementById('paypal-error-message');
  if (errorMessage) {
    errorMessage.textContent = message;
  }
}

function initPayPalButtons() {
  const container = document.getElementById('paypal-button-container');
  const form = document.getElementById('checkout-form');

  if (!container || !window.paypal || !form) return;

  const plan = plans[currentPlan] || plans.signature;

  paypalButtons = paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'checkout'
    },
    onClick: async (data, actions) => {
      if (!form.checkValidity()) {
        form.reportValidity();
        showCheckoutError('Please complete all required fields before paying.');
        return actions.reject();
      }
      if (paymentSubmitted) {
        showCheckoutError('Payment is already in progress. Please wait.');
        return actions.reject();
      }
      showCheckoutError('');
      paymentSubmitted = true;
      return actions.resolve();
    },
    createOrder: async (data, actions) => {
      const formData = new FormData(form);
      const orderPayload = {
        plan: plan.title,
        amount: plan.amount,
        status: 'pending',
        fullName: formData.get('fullName')?.toString() || '',
        email: formData.get('email')?.toString() || '',
        country: formData.get('country')?.toString() || '',
        propertyType: formData.get('propertyType')?.toString() || '',
        sizeBand: formData.get('sizeBand')?.toString() || '',
        notes: formData.get('notes')?.toString() || ''
      };

      try {
        backendOrder = await submitOrderToBackend(orderPayload);
      } catch (err) {
        paymentSubmitted = false;
        showCheckoutError(err.message || 'Unable to create order on the backend.');
        throw err;
      }

      return actions.order.create({
        purchase_units: [
          {
            amount: {
              value: plan.amount
            },
            description: plan.title,
            custom_id: backendOrder.orderId
          }
        ]
      });
    },
    onApprove: async (data, actions) => {
      const details = await actions.order.capture();
      const updatedOrder = {
        ...backendOrder,
        paypalOrderId: details.id,
        status: 'completed',
        captureTime: details.update_time || new Date().toISOString()
      };

      try {
        await submitOrderToBackend(updatedOrder);
      } catch (err) {
        console.error('Failed to update backend order after capture:', err);
      }

      const params = new URLSearchParams({
        status: 'success',
        orderId: updatedOrder.orderId
      });

      window.location.href = `checkout-success.html?${params.toString()}`;
    },
    onError: (err) => {
      paymentSubmitted = false;
      showCheckoutError('Payment failed. Please refresh and try again.');
      console.error('PayPal Checkout error:', err);
    },
    onCancel: () => {
      paymentSubmitted = false;
      showCheckoutError('Payment canceled. You may try again.');
    }
  });

  paypalButtons.render('#paypal-button-container');
}

function updatePlanSummary(planKey) {
  const summary = document.getElementById('plan-summary');
  const plan = plans[planKey] || plans.signature;
  if (summary) {
    summary.innerHTML = `<h3>${plan.title}</h3><p>${plan.price}</p>`;
  }
}

function initHashScroll() {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}
