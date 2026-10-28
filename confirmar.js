// Página privada: envía al cliente el correo "Pago confirmado" a partir del enlace del correo interno.
const EMAILJS_PUBLIC_KEY = 'RHL7Gs7SeeiFWCbIB';
const EMAILJS_SERVICE_ID = 'service_teovito';
// Pega aquí el Template ID de la plantilla "Pago confirmado" de EmailJS:
const EMAILJS_CONFIRM_TEMPLATE_ID = 'template_kbxyccl';

// Huella (SHA-256) del PIN de acceso. El PIN no se guarda en el código; es una barrera simple, no seguridad bancaria.
const PIN_HASH = '62c1a1412c8251a532cf5f01c4bf6e3fb2d3203889191f2759de217fe161837e';
const PIN_KEY = 'lcafe-admin-pin';
const SENT_KEY = 'lcafe-confirmados';

const statusEl = document.getElementById('status');
const sendButton = document.getElementById('sendConfirm');
const pinBox = document.getElementById('pinBox');
const pinInput = document.getElementById('pin');

function formatCLP(value) {
  return '$' + Number(value).toLocaleString('es-CL');
}

// "250 g, molido medio" (los pedidos anteriores a la molienda no la traen)
function itemFormat(item) {
  return item.g ? `${item.size}, ${String(item.g).toLowerCase()}` : item.size;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Sin almacenamiento: habrá que escribir el PIN cada vez
  }
}

function readOrder() {
  try {
    const order = JSON.parse(new URLSearchParams(location.search).get('d'));
    const valid = order && order.n && order.email && order.nombre && Array.isArray(order.items) && order.items.length;
    return valid ? order : null;
  } catch (e) {
    return null;
  }
}

function deliveryText(order) {
  return order.entrega === 'despacho'
    ? `Despacharemos tu pedido a ${order.direccion} en un plazo de 5 días hábiles.`
    : 'Tu pedido estará listo para retiro en nuestro local de Hamburgo 1155, Ñuñoa. Te escribiremos por WhatsApp para coordinar día y hora.';
}

async function sha256(text) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `admin-status ${type}`;
}

const order = readOrder();

if (!order) {
  document.getElementById('noData').hidden = false;
} else {
  document.getElementById('orderView').hidden = false;
  document.getElementById('aOrder').textContent = order.n;
  document.getElementById('aNombre').textContent = order.nombre;
  document.getElementById('aEmail').textContent = order.email;
  document.getElementById('aEntrega').textContent = order.entrega === 'despacho' ? `Despacho RM: ${order.direccion}` : 'Retiro en Hamburgo 1155, Ñuñoa';
  document.getElementById('aEnvio').textContent = order.envio ? formatCLP(order.envio) : 'Gratis';
  document.getElementById('aTotal').textContent = formatCLP(order.total);
  document.getElementById('aTotalCheck').textContent = formatCLP(order.total);

  const itemsEl = document.getElementById('aItems');
  order.items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.q} × ${item.name} (${itemFormat(item)}) — ${formatCLP(item.q * item.price)}`;
    itemsEl.appendChild(li);
  });

  const sent = readStorage(SENT_KEY, {});
  if (sent[order.n]) {
    const alreadySent = document.getElementById('alreadySent');
    alreadySent.hidden = false;
    alreadySent.textContent = `Ya enviaste la confirmación de este pedido (${sent[order.n]}). Si la envías de nuevo, al cliente le llegará otro correo.`;
    sendButton.textContent = 'Reenviar confirmación';
  }

  if (readStorage(PIN_KEY, '') === PIN_HASH) pinBox.hidden = true;

  if (!EMAILJS_CONFIRM_TEMPLATE_ID) {
    sendButton.disabled = true;
    showStatus('Falta configurar la plantilla "Pago confirmado" de EmailJS.', 'error');
  } else if (window.emailjs) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
}

sendButton.addEventListener('click', async () => {
  if (!order) return;
  if (!pinBox.hidden) {
    const hash = await sha256(pinInput.value.trim());
    if (hash !== PIN_HASH) {
      showStatus('PIN incorrecto.', 'error');
      pinInput.focus();
      return;
    }
    if (document.getElementById('rememberPin').checked) writeStorage(PIN_KEY, hash);
  }
  if (!window.emailjs) {
    showStatus('No se pudo cargar EmailJS. Revisa tu conexión y recarga la página.', 'error');
    return;
  }

  const cell = 'padding:10px 0;border-bottom:1px solid #EFE8DD;font-size:15px;color:#2C1810;';
  const params = {
    to_email: order.email,
    nombre: order.nombre.split(' ')[0],
    order_number: order.n,
    items_html: order.items.map(item =>
      `<tr><td style="${cell}">${Number(item.q)} × ${escapeHtml(item.name)}<br><span style="font-size:13px;color:#6D5D53;">Formato ${escapeHtml(itemFormat(item))}</span></td>` +
      `<td style="${cell}text-align:right;white-space:nowrap;">${formatCLP(item.q * item.price)}</td></tr>`
    ).join(''),
    shipping: order.envio ? formatCLP(order.envio) : 'Gratis',
    total: formatCLP(order.total),
    entrega: deliveryText(order)
  };

  sendButton.disabled = true;
  showStatus('Enviando…', 'info');
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CONFIRM_TEMPLATE_ID, params);
    const sent = readStorage(SENT_KEY, {});
    sent[order.n] = new Date().toLocaleString('es-CL');
    writeStorage(SENT_KEY, sent);
    pinBox.hidden = true;
    showStatus(`✓ Confirmación enviada a ${order.email}.`, 'success');
    sendButton.textContent = 'Confirmación enviada';
  } catch (err) {
    sendButton.disabled = false;
    showStatus(`No se pudo enviar (${(err && (err.text || err.message)) || 'error desconocido'}). Intenta de nuevo.`, 'error');
  }
});
