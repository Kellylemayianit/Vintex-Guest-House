/* ============================================================
   VINTEX GUEST HOUSE — script.js
   Cart state management & shared UI behaviour
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────── */
  const STORAGE_KEY = 'vintex_cart';
  const WHATSAPP_NUMBER = '254700000000';

  /* ── Room catalogue ─────────────────────────────────────────── */
  const ROOM_CATALOGUE = {
    'standard-single': { name: 'Standard Single Room', price: 2500, emoji: '🛏️' },
    'standard-double': { name: 'Standard Double Room', price: 3500, emoji: '🛌' },
    'standard-twin':   { name: 'Standard Twin Room',   price: 3500, emoji: '🏠' }
  };

  /* ══════════════════════════════════════════════════════════════
     CART MODULE
  ══════════════════════════════════════════════════════════════ */
  const Cart = {
    /* Load from localStorage, fall back to empty object */
    _data: null,

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this._data = raw ? JSON.parse(raw) : {};
      } catch (_) {
        this._data = {};
      }
      return this;
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      } catch (_) { /* storage quota — silently ignore */ }
      return this;
    },

    /* Return a shallow clone of cart data */
    getAll() {
      return Object.assign({}, this._data);
    },

    getItem(roomId) {
      return this._data[roomId] || null;
    },

    setQty(roomId, qty) {
      if (!ROOM_CATALOGUE[roomId]) return this;
      qty = Math.max(0, parseInt(qty, 10) || 0);
      if (qty === 0) {
        delete this._data[roomId];
      } else {
        this._data[roomId] = {
          roomId,
          name:  ROOM_CATALOGUE[roomId].name,
          price: ROOM_CATALOGUE[roomId].price,
          emoji: ROOM_CATALOGUE[roomId].emoji,
          qty
        };
      }
      return this.save();
    },

    addItem(roomId, qty) {
      const current = this._data[roomId] ? this._data[roomId].qty : 0;
      return this.setQty(roomId, current + qty);
    },

    removeItem(roomId) {
      return this.setQty(roomId, 0);
    },

    clear() {
      this._data = {};
      return this.save();
    },

    getTotalQty() {
      return Object.values(this._data).reduce((sum, item) => sum + item.qty, 0);
    },

    getTotalPrice() {
      return Object.values(this._data).reduce((sum, item) => sum + (item.price * item.qty), 0);
    },

    isEmpty() {
      return Object.keys(this._data).length === 0;
    }
  };

  /* Initialise cart on page load */
  Cart.load();

  /* Expose globally so whatsapp.js and inline scripts can access */
  window.VintexCart    = Cart;
  window.VINTEX_WA_NUM = WHATSAPP_NUMBER;

  /* ══════════════════════════════════════════════════════════════
     UI HELPERS
  ══════════════════════════════════════════════════════════════ */

  /* Show a brief toast message */
  function showToast(msg, duration = 2400) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* Update the cart count badge in nav */
  function updateCartBadge() {
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    const qty = Cart.getTotalQty();
    badge.textContent = qty;
    badge.classList.toggle('visible', qty > 0);
  }

  /* Format KES amount */
  function formatKES(amount) {
    return 'KES ' + Number(amount).toLocaleString('en-KE');
  }

  /* Render cart items inside the panel */
  function renderCartPanel() {
    const list        = document.getElementById('cartItemsList');
    const empty       = document.getElementById('cartEmpty');
    const footer      = document.getElementById('cartFooter');
    const notesWrap   = document.getElementById('cartNotesSection');
    const totalEl     = document.getElementById('cartTotalDisplay');
    if (!list) return;

    list.innerHTML = '';
    const items = Object.values(Cart.getAll());

    if (items.length === 0) {
      empty && (empty.style.display = 'block');
      footer && (footer.style.display = 'none');
      notesWrap && (notesWrap.style.display = 'none');
      return;
    }

    empty && (empty.style.display = 'none');
    footer && (footer.style.display = 'block');
    notesWrap && (notesWrap.style.display = 'block');

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.dataset.roomId = item.roomId;
      li.innerHTML = `
        <div class="cart-item__info">
          <div class="cart-item__name">${item.emoji} ${item.name}</div>
          <div class="cart-item__qty">${item.qty} room${item.qty !== 1 ? 's' : ''} × ${formatKES(item.price)}</div>
          <button class="cart-item__remove" data-remove="${item.roomId}">Remove</button>
        </div>
        <div class="cart-item__price">${formatKES(item.price * item.qty)}</div>
      `;
      list.appendChild(li);
    });

    if (totalEl) totalEl.textContent = formatKES(Cart.getTotalPrice());

    /* Bind remove buttons */
    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.dataset.remove;
        Cart.removeItem(id);
        dispatchCartUpdated();
        renderCartPanel();
        updateCartBadge();
        syncAddButtons();
        showToast('Room removed from cart.');
      });
    });
  }

  /* Fire a custom event so other scripts / inline code can react */
  function dispatchCartUpdated() {
    document.dispatchEvent(new CustomEvent('vintex:cartUpdated'));
  }

  /* ── Sync "Add to Cart" buttons with current cart state ─────── */
  function syncAddButtons() {
    document.querySelectorAll('[data-room-id].btn-add-cart').forEach(btn => {
      const id   = btn.dataset.roomId;
      const item = Cart.getItem(id);
      if (item && item.qty > 0) {
        btn.textContent = `✓ In Cart (${item.qty})`;
        btn.classList.add('added');
      } else {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('added');
      }
    });
  }

  /* ── Quantity stepper helper ────────────────────────────────── */
  function getDisplayQty(roomId) {
    const el = document.getElementById('qty-' + roomId);
    return el ? parseInt(el.textContent, 10) || 1 : 1;
  }

  function setDisplayQty(roomId, val) {
    const el = document.getElementById('qty-' + roomId);
    if (el) el.textContent = Math.max(1, val);
  }

  /* ══════════════════════════════════════════════════════════════
     EVENT BINDINGS
  ══════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', function () {

    /* ── Nav scroll shadow ─────────────────────────────────────── */
    const nav = document.getElementById('mainNav');
    if (nav) {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 20);
      }, { passive: true });
    }

    /* ── Mobile hamburger ──────────────────────────────────────── */
    const toggle  = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (toggle && mobileMenu) {
      toggle.addEventListener('click', function () {
        this.classList.toggle('open');
        mobileMenu.classList.toggle('open');
      });
    }

    /* ── Cart panel open / close ───────────────────────────────── */
    const cartPanel   = document.getElementById('cartPanel');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartToggle  = document.getElementById('cartToggle');
    const cartClose   = document.getElementById('cartClose');

    function openCart() {
      cartPanel   && cartPanel.classList.add('open');
      cartOverlay && cartOverlay.classList.add('open');
      renderCartPanel();
    }
    function closeCart() {
      cartPanel   && cartPanel.classList.remove('open');
      cartOverlay && cartOverlay.classList.remove('open');
    }

    cartToggle  && cartToggle.addEventListener('click', openCart);
    cartClose   && cartClose.addEventListener('click', closeCart);
    cartOverlay && cartOverlay.addEventListener('click', closeCart);

    /* Keyboard close */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    /* ── Quantity steppers (services page) ─────────────────────── */
    document.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const roomId = this.dataset.roomId;
        const action = this.dataset.action;
        const current = getDisplayQty(roomId);
        const next    = action === 'increase' ? current + 1 : Math.max(1, current - 1);
        setDisplayQty(roomId, next);
      });
    });

    /* ── Add to cart buttons ───────────────────────────────────── */
    document.querySelectorAll('[data-room-id].btn-add-cart').forEach(btn => {
      btn.addEventListener('click', function () {
        const roomId = this.dataset.roomId;
        const qty    = getDisplayQty(roomId);

        Cart.addItem(roomId, qty);
        dispatchCartUpdated();
        renderCartPanel();
        updateCartBadge();
        syncAddButtons();

        const room = ROOM_CATALOGUE[roomId];
        showToast(`${room.emoji} ${qty} × ${room.name} added!`);

        /* Auto-open cart panel on first add */
        if (Cart.getTotalQty() === qty) {
          setTimeout(openCart, 600);
        }
      });
    });

    /* ── WhatsApp checkout button ──────────────────────────────── */
    const checkoutBtn = document.getElementById('checkoutWhatsApp');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        const notes = document.getElementById('cartNotesInput')?.value?.trim() || '';
        if (typeof window.sendVintexWhatsApp === 'function') {
          window.sendVintexWhatsApp(Cart, notes, WHATSAPP_NUMBER);
        }
      });
    }

    /* ── Initial render ────────────────────────────────────────── */
    updateCartBadge();
    syncAddButtons();
  });

})();
