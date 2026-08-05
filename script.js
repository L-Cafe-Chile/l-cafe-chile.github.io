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
const PRICE_250G = 12990;

function formatCLP(value) {
  return '$' + value.toLocaleString('es-CL');
}

function updateModalPrice() {
  const selected = document.querySelector('input[name="modalSize"]:checked');
  if (!selected) return;
  if (selected.value === '250') {
    modalPrice.textContent = formatCLP(PRICE_250G);
  } else {
    modalPrice.textContent = formatCLP(Number(productModal.dataset.kgPrice)) + ' / kg';
  }
}

function openProductModal(card) {
  modalImg.src = card.querySelector('.product-img').src;
  modalImg.alt = card.querySelector('.product-img').alt;
  modalTitle.textContent = card.querySelector('.product-title').textContent;
  modalDesc.textContent = card.dataset.desc || card.querySelector('.product-text').textContent;
  productModal.dataset.kgPrice = card.dataset.kgPrice;

  const size250 = document.querySelector('input[name="modalSize"][value="250"]');
  if (size250) size250.checked = true;
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProductModal();
});
