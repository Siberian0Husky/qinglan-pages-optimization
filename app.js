const page = document.body.dataset.page;

window.addEventListener('DOMContentLoaded', () => {
  setYear();
  setActiveNav();
  initPlanButtons();
  initHashScroll();
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
  const summary = document.getElementById('plan-summary');
  const plans = {
    starter: {
      title: 'Starter Compass Report',
      price: 'USD 79.00'
    },
    signature: {
      title: 'Signature Spatial Audit',
      price: 'USD 189.00'
    },
    business: {
      title: 'Business Flow Blueprint',
      price: 'USD 329.00'
    }
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const plan = plans[button.dataset.selectPlan] || plans.signature;
      if (summary) {
        summary.innerHTML = `<h3>${plan.title}</h3><p>${plan.price}</p>`;
      }
      window.location.hash = button.dataset.selectPlan;
    });
  });
}

function initHashScroll() {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}
