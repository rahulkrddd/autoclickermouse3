let coItems = [];
let coDiscount = 0;
let coCoupon = '';
let coProducts = [];

const CHECKOUT_CACHE_KEY = 'acm_checkout_customer';
const CHECKOUT_FIELDS = ['name', 'mobile', 'address', 'pincode'];
const CHECKOUT_ERRORS = {
  name: 'Enter a valid name',
  mobile: 'Enter a valid 10-digit Indian mobile number',
  address: 'Enter at least 10 characters',
  pincode: 'Enter a valid 6-digit pincode'
};

async function fetchCustomerFromHistory() {

    const mobile =
        localStorage.getItem('mobileNumber');

    if (!mobile) {
        return null;
    }

    try {

        const response =
            await fetch('/my-orders', {

                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    mobileNumber: mobile
                })

            });

        const data =
            await response.json();

        if (
            response.ok &&
            data.orders &&
            data.orders.length
        ) {

            const latest =
                data.orders[0];

            const customer = {

                name:
                    latest.name || '',

                mobile:
                    latest.mobile || '',

                address:
                    latest.address || '',

                pincode:
                    latest.pincode || ''

            };

            localStorage.setItem(
                'acm_checkout_customer',
                JSON.stringify(customer)
            );

            return customer;
        }

    } catch (err) {

        console.error(
            'Customer lookup failed',
            err
        );

    }

    return null;
}

function cf(id, label, area = false) {
  return `<div class="field validation-field">
    <label>${label}</label>
    ${area
      ? `<textarea id="co_${id}" required></textarea>`
      : `<input id="co_${id}" required inputmode="${id === 'mobile' || id === 'pincode' ? 'numeric' : 'text'}">`
    }
    <span class="valid-tick">✓</span>
    <small class="field-error"></small>
  </div>`;
}

function valid(id, value) {
  const v = String(value || '').trim();
  if (id === 'name') return /^[A-Za-z\u0900-\u097F .'-]{2,60}$/.test(v);
  if (id === 'mobile') return /^[6-9]\d{9}$/.test(v);
  if (id === 'pincode') return /^\d{6}$/.test(v);
  return v.length >= 10;
}

function getCheckoutCache() {
  let cached = {};
  try {
    cached = JSON.parse(localStorage.getItem(CHECKOUT_CACHE_KEY) || '{}');
  } catch (_) {
    cached = {};
  }

  // Backward compatibility with the mobile number already used by My Orders.
  if (!cached.mobile) cached.mobile = localStorage.getItem('mobileNumber') || '';
  return cached;
}

function saveCheckoutCache() {
  const data = {};
  CHECKOUT_FIELDS.forEach(id => {
    const field = document.querySelector(`#co_${id}`);
    data[id] = field ? field.value.trim() : '';
  });

  localStorage.setItem(CHECKOUT_CACHE_KEY, JSON.stringify(data));
  if (data.mobile) localStorage.setItem('mobileNumber', data.mobile);
}

function showFieldValidation(id, force = false) {
  const field = document.querySelector(`#co_${id}`);
  if (!field) return false;

  const box = field.closest('.validation-field');
  const touched = field.dataset.touched === 'true';
  const isValid = valid(id, field.value);

  // On initial checkout open, calculate validity silently without showing errors.
  if (!force && !touched) {
    box.classList.remove('is-valid', 'is-invalid');
    box.querySelector('.field-error').textContent = '';
    return isValid;
  }

  box.classList.toggle('is-valid', isValid);
  box.classList.toggle('is-invalid', !isValid);
  box.querySelector('.field-error').textContent = isValid ? '' : CHECKOUT_ERRORS[id];
  return isValid;
}

function validateCO(force = false) {
  let allValid = true;
  CHECKOUT_FIELDS.forEach(id => {
    if (!showFieldValidation(id, force)) allValid = false;
  });

  const consent = document.querySelector('#co_consent');
  const payButton = document.querySelector('#co_pay');
  if (payButton) payButton.disabled = !(allValid && consent && consent.checked);
  return allValid;
}

window.openDirectCheckout = async function (items, prefill = {}, opts = {}) {
  coItems = items;
  coDiscount = +opts.discount || 0;
  coCoupon = opts.coupon || '';
  document.querySelector('#directCheckoutModal')?.remove();

  try {
    coProducts = await fetch('/api/products').then(r => r.json());
  } catch (_) {
    coProducts = [];
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal open" id="directCheckoutModal">
      <div class="panel checkout-panel">
        <button class="close" type="button">×</button>
        <div class="checkout-title">
          <div><small>SECURE CHECKOUT</small></div>
        </div>
        <form id="coForm" novalidate>
          ${cf('name', 'Name')}
          ${cf('mobile', 'Mobile number')}
          ${cf('address', 'Delivery address', true)}
          ${cf('pincode', 'Pincode')}
          <section class="coupon-box">
            <label>Have a coupon?</label>
            <div class="coupon-row">
              <input id="co_coupon" value="${coCoupon}" placeholder="Enter coupon code">
              <button class="pill" id="co_apply" type="button">Apply</button>
            </div>
            <div id="co_coupon_msg"></div>
          </section>
          <label class="consent-box">
            <input id="co_consent" type="checkbox" checked>
            <span>I consent to use of these details for checkout, order support and failure recovery.</span>
          </label>
          <button id="co_pay" class="pill primary pay-button" disabled>Pay Now</button>
        </form>
      </div>
    </div>`);

let cached =
    getCheckoutCache();

if(
    !cached.name &&
    cached.mobile &&
    !cached.address
){
    const dbData =
        await fetchCustomerFromHistory();

    if(dbData){
        cached = dbData;
    }
}

  CHECKOUT_FIELDS.forEach(id => {
    const field = document.querySelector(`#co_${id}`);
    field.value = prefill[id] || cached[id] || '';
    field.dataset.touched = 'false';

    field.addEventListener('input', () => {
      field.dataset.touched = 'true';
      saveCheckoutCache();
      validateCO(false);
    });

    field.addEventListener('blur', () => {
      field.dataset.touched = 'true';
      saveCheckoutCache();
      showFieldValidation(id, true);
      validateCO(false);
    });
  });

  document.querySelector('#co_consent').addEventListener('change', () => validateCO(false));
  document.querySelector('#co_apply').addEventListener('click', applyCoupon);
  document.querySelector('#directCheckoutModal .close').addEventListener('click', () => {
    saveCheckoutCache();
    document.querySelector('#directCheckoutModal').remove();
  });
  document.querySelector('#coForm').addEventListener('submit', payCO);

  // Silent check: enables Pay Now for valid cached values, but shows no opening errors.
  validateCO(false);
  if (coCoupon) showCoupon();
};

async function subtotal() {
  const products = await fetch('/api/products').then(r => r.json());
  return coItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * (+item.quantity || 1) : 0);
  }, 0);
}

async function applyCoupon() {
  const code = document.querySelector('#co_coupon').value.trim().toUpperCase();
  const sub = await subtotal();
  const response = await fetch('/api/coupon', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code, subtotal: sub})
  });
  const data = await response.json();

  if (!response.ok) {
    coCoupon = '';
    coDiscount = 0;
    document.querySelector('#co_coupon_msg').innerHTML = `<div class="coupon-error">${data.message}</div>`;
    return;
  }

  coCoupon = data.code;
  coDiscount = data.discount;
  showCoupon();
}

function showCoupon() {
  document.querySelector('#co_coupon').value = coCoupon;
  document.querySelector('#co_coupon_msg').innerHTML = `
    <div class="coupon-success">
      <span>✓</span>
      <div>
        <b>${coCoupon} applied</b>
        <small>You save ₹${coDiscount}. Discount will be applied to payment.</small>
      </div>
    </div>`;
}

async function payCO(event) {
  event.preventDefault();

  CHECKOUT_FIELDS.forEach(id => {
    const field = document.querySelector(`#co_${id}`);
    field.dataset.touched = 'true';
  });

  if (!validateCO(true)) return;
  saveCheckoutCache();

  const customer = {
    name: document.querySelector('#co_name').value.trim(),
    mobile: document.querySelector('#co_mobile').value.trim(),
    address: document.querySelector('#co_address').value.trim(),
    pincode: document.querySelector('#co_pincode').value.trim()
  };
  const button = document.querySelector('#co_pay');
  button.disabled = true;
  button.textContent = 'Preparing payment…';

  try {
    const response = await fetch('/createOrder', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({items: coItems, coupon: coCoupon, customer})
    });
    const order = await response.json();
    if (!response.ok) throw Error(order.message);

    new Razorpay({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: 'AutoClickerMouse',
      prefill: {name: customer.name, contact: customer.mobile},
      handler: async payment => {
        const verifyResponse = await fetch('/verifyPayment', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            payment_id: payment.razorpay_payment_id,
            order_id: payment.razorpay_order_id,
            signature: payment.razorpay_signature
          })
        });
        const data = await verifyResponse.json();
        if (!data.success) throw Error(data.message || 'Verification failed');

        saveCheckoutCache();
        localStorage.setItem('mobileNumber', customer.mobile);
        document.querySelector('#directCheckoutModal .panel').innerHTML = `
          <div class="payment-success">
            <div class="success-icon">✓</div>
            <h2>Payment successful</h2>
            <p>Order <b>${data.order.order_id}</b> created.</p>
            <a class="pill primary" href="/my-orders?mobileNumber=${encodeURIComponent(customer.mobile)}">View My Orders</a>
          </div>`;
      },
      modal: {
        ondismiss: () => {
          button.disabled = false;
          button.textContent = 'Pay Now';
        }
      }
    }).open();
  } catch (error) {
    toast(error.message || 'Unable to start payment');
    button.disabled = false;
    button.textContent = 'Pay Now';
  }
}
