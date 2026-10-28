// Mobile menu toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// Close menu on link click
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
  });
});

// Navbar shadow on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Contact form handler
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = '¡Mensaje Enviado!';
  btn.style.background = '#4CAF50';
  btn.style.color = '#fff';
  e.target.reset();
  setTimeout(() => {
    btn.textContent = 'Enviar Mensaje';
    btn.style.background = '';
    btn.style.color = '';
  }, 3000);
}

// Scroll animations
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.service-card, .contact-form, .contact-info, .about-content').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Modal de producto: selección de formato (250g / kg)
const productModal = document.getElementById('productModal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalPrice = document.getElementById('modalPrice');
const modalQty = document.getElementById('modalQty');
const DEFAULT_PRICE_250G = 12990;
let modalQuantity = 1;

function formatCLP(value) {
  return '$' + value.toLocaleString('es-CL');
}

function getModalSelection() {
  const selected = document.querySelector('input[name="modalSize"]:checked');
  if (selected && selected.value === '1000') {
    return { size: '1 kg', price: Number(productModal.dataset.kgPrice) };
  }
  return { size: '250 g', price: Number(productModal.dataset.price250) || DEFAULT_PRICE_250G };
}

function updateModalPrice() {
  const { size, price } = getModalSelection();
  modalPrice.textContent = formatCLP(price) + (size === '1 kg' ? ' / kg' : '');
}

function setModalQty(value) {
  modalQuantity = Math.max(1, Math.min(20, value));
  modalQty.textContent = modalQuantity;
}

function openProductModal(card) {
  modalImg.src = card.querySelector('.product-img').src;
  modalImg.alt = card.querySelector('.product-img').alt;
  modalTitle.textContent = card.querySelector('.product-title').textContent;
  modalDesc.textContent = card.dataset.desc || card.querySelector('.product-text').textContent;
  productModal.dataset.kgPrice = card.dataset.kgPrice;
  productModal.dataset.price250 = card.dataset['250Price'] || '';

  const size250 = document.querySelector('input[name="modalSize"][value="250"]');
  if (size250) size250.checked = true;
  setModalQty(1);
  updateModalPrice();

  productModal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeProductModal() {
  productModal.classList.remove('active');
  document.body.classList.remove('modal-open');
}

document.querySelectorAll('.product-card').forEach(card => {
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => openProductModal(card));
});

document.querySelectorAll('input[name="modalSize"]').forEach(input => {
  input.addEventListener('change', updateModalPrice);
  input.addEventListener('click', (e) => e.stopPropagation());
});

document.getElementById('modalQtyDec').addEventListener('click', () => setModalQty(modalQuantity - 1));
document.getElementById('modalQtyInc').addEventListener('click', () => setModalQty(modalQuantity + 1));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProductModal();
});

// === Pedido y pago con Webpay ===
// Pega aquí, entre las comillas, el link de pago que generaste en Transbank:
const WEBPAY_URL = 'https://www.webpay.cl/form-pay/434839';
const SHIPPING_RM = 4000;
const ORDER_EMAIL = 'lcafechile@gmail.com';

// Correo de confirmación con logo (EmailJS). Pega aquí los 3 datos de tu cuenta de EmailJS;
// mientras estén vacíos, el cliente recibe la confirmación en texto simple por FormSubmit.
const EMAILJS_PUBLIC_KEY = '';
const EMAILJS_SERVICE_ID = '';
const EMAILJS_TEMPLATE_ID = '';

function emailjsReady() {
  return Boolean(EMAILJS_PUBLIC_KEY && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && window.emailjs);
}

if (emailjsReady()) emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
const CART_KEY = 'lcafe-cart';
const PICKUP_LABEL = 'retiro en local (Hamburgo 1155, Ñuñoa)';

const cartItemsEl = document.getElementById('cartItems');
const cartEmptyEl = document.getElementById('cartEmpty');
const cartCountEl = document.getElementById('cartCount');
const orderForm = document.getElementById('orderForm');
const orderSubmit = document.getElementById('orderSubmit');
const addressFields = document.getElementById('addressFields');
const payStep = document.getElementById('payStep');
const toast = document.getElementById('toast');
let cart = loadCart();
let currentOrder = null;
let toastTimer;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    // Sin almacenamiento disponible: el pedido vive solo en esta visita
  }
}

function getDelivery() {
  return document.querySelector('input[name="delivery"]:checked').value;
}

function cartSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function shippingCost() {
  return cart.length && getDelivery() === 'despacho' ? SHIPPING_RM : 0;
}

function renderCart() {
  cartItemsEl.innerHTML = '';
  cart.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.dataset.index = index;
    li.innerHTML = `
      <div class="cart-item-info"><strong></strong><small></small></div>
      <div class="qty-control">
        <button type="button" data-action="dec" aria-label="Quitar uno">−</button>
        <span></span>
        <button type="button" data-action="inc" aria-label="Agregar uno">+</button>
      </div>
      <span class="cart-item-total"></span>
      <button type="button" class="cart-item-remove" data-action="remove" aria-label="Eliminar">&times;</button>`;
    li.querySelector('strong').textContent = item.name;
    li.querySelector('small').textContent = `${item.size} · ${formatCLP(item.price)} c/u`;
    li.querySelector('.qty-control span').textContent = item.qty;
    li.querySelector('.cart-item-total').textContent = formatCLP(item.price * item.qty);
    cartItemsEl.appendChild(li);
  });

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCountEl.textContent = count;
  cartEmptyEl.hidden = cart.length > 0;
  orderSubmit.disabled = cart.length === 0;

  document.getElementById('cartSubtotal').textContent = formatCLP(cartSubtotal());
  document.getElementById('cartShipping').textContent = shippingCost() ? formatCLP(shippingCost()) : (getDelivery() === 'retiro' ? 'Gratis' : '$0');
  document.getElementById('cartTotal').textContent = formatCLP(cartSubtotal() + shippingCost());
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

document.getElementById('modalAddToCart').addEventListener('click', () => {
  const { size, price } = getModalSelection();
  const name = modalTitle.textContent;
  const existing = cart.find(item => item.name === name && item.size === size);
  if (existing) {
    existing.qty += modalQuantity;
  } else {
    cart.push({ name, size, price, qty: modalQuantity });
  }
  saveCart();
  renderCart();
  closeProductModal();
  showToast(`${name} (${size}) agregado · Ver mi pedido →`);
});

cartItemsEl.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const index = Number(button.closest('.cart-item').dataset.index);
  const action = button.dataset.action;
  if (action === 'inc') cart[index].qty = Math.min(20, cart[index].qty + 1);
  if (action === 'dec') cart[index].qty -= 1;
  if (action === 'remove' || cart[index].qty < 1) cart.splice(index, 1);
  saveCart();
  renderCart();
});

function updateDeliveryFields() {
  const needsAddress = getDelivery() === 'despacho';
  addressFields.hidden = !needsAddress;
  addressFields.querySelectorAll('input').forEach(input => {
    input.required = needsAddress;
    input.disabled = !needsAddress;
  });
  renderCart();
}

document.querySelectorAll('input[name="delivery"]').forEach(input => {
  input.addEventListener('change', updateDeliveryFields);
});

orderForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!cart.length) return;
  if (!WEBPAY_URL) {
    alert('El pago online aún no está disponible. Escríbenos por WhatsApp al +56 9 8235 7332 para completar tu pedido.');
    return;
  }

  const data = new FormData(orderForm);
  const delivery = getDelivery();
  const total = cartSubtotal() + shippingCost();
  const orderNumber = 'LC-' + Date.now().toString(36).toUpperCase().slice(-6);

  // El asunto resume monto, entrega y cafés para cruzarlo rápido con el aviso de pago de Transbank
  const summary = cart.map(item => `${item.qty}x ${item.name} (${item.size})`).join(', ');
  const payload = {
    _subject: `Pedido ${orderNumber} · ${formatCLP(total)} · ${delivery === 'despacho' ? 'Con despacho' : 'Retiro'} · ${summary}`,
    _template: 'table',
    Estado: `Pendiente de pago: verifica en Transbank un pago por ${formatCLP(total)}`,
    Pedido: orderNumber,
    'Total a pagar': formatCLP(total),
    Despacho: delivery === 'despacho' ? 'Sí, despacho RM ($4.000, 5 días hábiles)' : `No, ${PICKUP_LABEL}`
  };
  cart.forEach((item, i) => {
    payload[`Café ${i + 1}`] = `${item.qty} x ${item.name}, formato ${item.size}, ${formatCLP(item.price)} c/u = ${formatCLP(item.price * item.qty)}`;
  });
  Object.assign(payload, {
    Subtotal: formatCLP(cartSubtotal()),
    Envío: shippingCost() ? formatCLP(shippingCost()) : 'Gratis',
    Nombre: data.get('nombre'),
    email: data.get('email'),
    Teléfono: data.get('telefono'),
    Dirección: delivery === 'despacho' ? `${data.get('direccion')}, ${data.get('comuna')}` : '—',
    Notas: data.get('notas') || '—'
  });

  // Confirmación al cliente: con diseño vía EmailJS si está configurado; si no, texto simple vía FormSubmit
  if (emailjsReady()) {
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, buildCustomerEmailParams(data, orderNumber, delivery, total))
      .catch(() => {});
  } else {
    payload._autoresponse = buildCustomerConfirmation(data.get('nombre'), orderNumber, delivery, total);
  }

  sendOrderEmail(payload);

  currentOrder = {
    number: orderNumber,
    total,
    delivery,
    summary,
    nombre: data.get('nombre'),
    email: data.get('email'),
    telefono: data.get('telefono')
  };

  payStep.querySelectorAll('.order-number').forEach(el => { el.textContent = orderNumber; });
  document.getElementById('payAmount').textContent = formatCLP(total);
  document.getElementById('payLink').href = WEBPAY_URL;
  setPaymentStatus(false);
  orderForm.hidden = true;
  payStep.hidden = false;
  payStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function deliveryDescription(delivery) {
  return delivery === 'despacho'
    ? 'Despacho a domicilio en la Región Metropolitana, en un plazo de 5 días hábiles desde la confirmación del pago.'
    : 'Retiro en nuestro local de Hamburgo 1155, Ñuñoa. Te escribiremos por WhatsApp para coordinar día y hora.';
}

// Variables que usa la plantilla de EmailJS: {{nombre}}, {{order_number}}, {{{items_html}}}, {{shipping}}, {{total}}, {{entrega}}, {{pay_url}}
function buildCustomerEmailParams(data, orderNumber, delivery, total) {
  const cell = 'padding:10px 0;border-bottom:1px solid #EFE8DD;font-size:15px;color:#2C1810;';
  return {
    to_email: data.get('email'),
    nombre: data.get('nombre').split(' ')[0],
    order_number: orderNumber,
    items_html: cart.map(item =>
      `<tr><td style="${cell}">${item.qty} × ${item.name}<br><span style="font-size:13px;color:#6D5D53;">Formato ${item.size}</span></td>` +
      `<td style="${cell}text-align:right;white-space:nowrap;">${formatCLP(item.price * item.qty)}</td></tr>`
    ).join(''),
    shipping: shippingCost() ? formatCLP(shippingCost()) : 'Gratis',
    total: formatCLP(total),
    entrega: deliveryDescription(delivery),
    pay_url: WEBPAY_URL
  };
}

function buildCustomerConfirmation(nombre, orderNumber, delivery, total) {
  const lines = cart.map(item => `- ${item.qty} x ${item.name} (${item.size}): ${formatCLP(item.price * item.qty)}`);
  const entrega = deliveryDescription(delivery);
  return [
    `¡Hola ${nombre.split(' ')[0]}! Recibimos tu pedido ${orderNumber} en L'Café.`,
    '',
    'Detalle de tu pedido:',
    ...lines,
    `Envío: ${shippingCost() ? formatCLP(shippingCost()) : 'Gratis'}`,
    `Total: ${formatCLP(total)}`,
    '',
    `Entrega: ${entrega}`,
    '',
    `Si aún no pagas, puedes hacerlo en ${WEBPAY_URL} ingresando exactamente ${formatCLP(total)}.`,
    'Una vez que validemos tu pago, te confirmaremos por email o WhatsApp.',
    '',
    '¡Gracias por preferirnos!',
    "L'Café · lcafe.cl · +56 9 8235 7332 · Instagram @lcafechile"
  ].join('\n');
}

function sendOrderEmail(payload) {
  fetch(`https://formsubmit.co/ajax/${ORDER_EMAIL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function setPaymentStatus(paid) {
  const stepPay = document.getElementById('stepPay');
  const stepConfirm = document.getElementById('stepConfirm');
  stepPay.classList.toggle('current', !paid);
  stepPay.classList.toggle('done', paid);
  stepPay.querySelector('.step-icon').textContent = paid ? '✓' : '2';
  stepConfirm.classList.toggle('current', paid);
  document.getElementById('stepPayText').textContent = paid ? 'Pago informado' : 'Pendiente';
  document.getElementById('stepConfirmText').textContent = paid
    ? 'En validación: contrastamos tu pedido con el pago.'
    : 'Validamos tu pago y te avisamos.';
  document.getElementById('payPanel').hidden = paid;
  document.getElementById('paidPanel').hidden = !paid;
}

document.getElementById('copyAmount').addEventListener('click', (e) => {
  const button = e.currentTarget;
  navigator.clipboard.writeText(String(currentOrder.total))
    .then(() => {
      button.textContent = '¡Monto copiado!';
      setTimeout(() => { button.textContent = 'Copiar monto'; }, 2000);
    })
    .catch(() => {});
});

document.getElementById('paidButton').addEventListener('click', () => {
  if (!currentOrder) return;
  sendOrderEmail({
    _subject: `Pago informado · Pedido ${currentOrder.number} · ${formatCLP(currentOrder.total)} · ${currentOrder.delivery === 'despacho' ? 'Con despacho' : 'Retiro'}`,
    _template: 'table',
    Estado: `El cliente informa que pagó. Valida en Transbank un pago por ${formatCLP(currentOrder.total)}`,
    Pedido: currentOrder.number,
    'Monto pagado': formatCLP(currentOrder.total),
    Productos: currentOrder.summary,
    Entrega: currentOrder.delivery === 'despacho' ? 'Despacho RM' : PICKUP_LABEL,
    Nombre: currentOrder.nombre,
    email: currentOrder.email,
    Teléfono: currentOrder.telefono
  });

  document.getElementById('paidName').textContent = currentOrder.nombre.split(' ')[0];
  document.getElementById('paidAmount').textContent = formatCLP(currentOrder.total);
  document.getElementById('paidDelivery').textContent = currentOrder.delivery === 'despacho'
    ? 'Una vez confirmado, despachamos tu pedido en un plazo de 5 días hábiles.'
    : 'Una vez confirmado, te escribimos por WhatsApp para coordinar el retiro en Hamburgo 1155, Ñuñoa.';
  setPaymentStatus(true);

  cart = [];
  saveCart();
  renderCart();
});

document.getElementById('newOrder').addEventListener('click', () => {
  currentOrder = null;
  orderForm.reset();
  orderForm.hidden = false;
  payStep.hidden = true;
  updateDeliveryFields();
});

updateDeliveryFields();
