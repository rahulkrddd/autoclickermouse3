let discount = 0;
let coupon = '';

function render() {
  const items = cart();
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  $('#rows').innerHTML = items.map((item, index) => `
    <div class="cartrow">
      <a href="/product/${item.slug || ''}">
        <img src="${item.image}" alt="${item.name}">
      </a>
      <div>
        <h3><a href="/product/${item.slug || ''}">${item.name}</a></h3>
        <p>₹${item.price}</p>
        <select onchange="qty(${index}, this.value)" aria-label="Quantity for ${item.name}">
          ${[1,2,3,4,5,6,7,8,9,10].map(number => `
            <option value="${number}" ${number === Number(item.quantity) ? 'selected' : ''}>
              ${number}
            </option>
          `).join('')}
        </select>
      </div>
      <button class="pill danger" onclick="removeItem(${index})">Remove</button>
    </div>
  `).join('') || '<div class="order">Your cart is empty.</div>';

  $('#sub').textContent = subtotal;
  $('#totalQty').textContent = totalQuantity;
  $('#total').textContent = Math.max(0, subtotal - discount);

  // Discount row is optional, so its absence must never stop cart rendering.
  const discountElement = $('#discount');
  if (discountElement) discountElement.textContent = discount;

  updateCount();
}

window.qty = (index, value) => {
  const items = cart();
  items[index].quantity = Number(value);
  saveCart(items);

  // Quantity change invalidates the previously calculated coupon discount.
  discount = 0;
  coupon = '';
  clearCouponMessage();
  render();
};

window.removeItem = index => {
  const items = cart();
  const removedProduct = items[index];
  items.splice(index, 1);
  saveCart(items);
  track('cart_remove', {productId: removedProduct.id});

  discount = 0;
  coupon = '';
  clearCouponMessage();
  render();
};

function clearCouponMessage() {
  const message = $('#couponMsg');
  if (!message) return;
  message.className = '';
  message.innerHTML = '';
}

$('#apply').onclick = async () => {
  const code = $('#coupon').value.trim().toUpperCase();
  const subtotal = Number($('#sub').textContent || 0);
  const message = $('#couponMsg');

  if (!code) {
    discount = 0;
    coupon = '';
    render();
    message.className = 'coupon-message error';
    message.textContent = 'Please enter a coupon code';
    return;
  }

  try {
    const response = await fetch('/api/coupon', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({code, subtotal})
    });
    const data = await response.json();

    if (!response.ok) {
      discount = 0;
      coupon = '';
      render();
      message.className = 'coupon-message error';
      message.textContent = data.message || 'Invalid coupon or minimum order not met';
      return;
    }

    discount = Number(data.discount || 0);
    coupon = data.code || code;
    render();

    message.className = 'coupon-message success';
    message.innerHTML = `
      <span class="coupon-burst">✓</span>
      <span>
        <b>${coupon} Applied Successfully</b>
        <small>You saved ₹${discount}</small>
      </span>
    `;

    message.animate(
      [
        {transform: 'translateY(20px) scale(.9)', opacity: 0},
        {transform: 'translateY(-4px) scale(1.03)', opacity: 1},
        {transform: 'translateY(0) scale(1)', opacity: 1}
      ],
      {duration: 700, easing: 'cubic-bezier(.18,.89,.32,1.28)'}
    );
  } catch (error) {
    discount = 0;
    coupon = '';
    render();
    message.className = 'coupon-message error';
    message.textContent = 'Unable to apply coupon. Please try again.';
  }
};

$('#checkout').onclick = () => {
  const items = cart();
  if (!items.length) return toast('Your cart is empty');

  openDirectCheckout(
    items.map(item => ({productId: item.id, quantity: Number(item.quantity)})),
    {},
    {discount, coupon, clearCartOnSuccess: true}
  );
};

// Keep the old static modal harmless because the active checkout uses directCheckoutModal.
const oldCheckoutClose = $('#checkoutModal .close');
if (oldCheckoutClose) {
  oldCheckoutClose.onclick = () => $('#checkoutModal').classList.remove('open');
}

render();
