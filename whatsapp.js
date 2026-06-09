/* ============================================================
   VINTEX GUEST HOUSE — whatsapp.js
   Builds a clean, formatted WhatsApp enquiry from cart data
   and redirects the user to the WhatsApp API URL.
   ============================================================ */

(function () {
  'use strict';

  /* ── Helpers ──────────────────────────────────────────────── */

  function formatKES(amount) {
    return 'KES ' + Number(amount).toLocaleString('en-KE');
  }

  /* Zero-pad a number */
  function pad(n) { return String(n).padStart(2, '0'); }

  /* Human-readable date: "Mon, 09 Jun 2025" */
  function todayLabel() {
    const d = new Date();
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]}, ${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* Separator line for readability */
  const LINE  = '─────────────────────────';
  const DLINE = '═════════════════════════';

  /* ══════════════════════════════════════════════════════════════
     MAIN FUNCTION
     @param {Object} Cart        - the VintexCart module from script.js
     @param {string} customNotes - free-text special requests
     @param {string} waNumber    - WhatsApp number without '+'
  ══════════════════════════════════════════════════════════════ */

  function sendVintexWhatsApp(Cart, customNotes, waNumber) {

    /* Guard: cart must not be empty */
    if (!Cart || Cart.isEmpty()) {
      alert('Your cart is empty. Please select at least one room before sending an enquiry.');
      return;
    }

    const items      = Object.values(Cart.getAll());
    const totalPrice = Cart.getTotalPrice();
    const totalRooms = Cart.getTotalQty();
    const notes      = (customNotes || '').trim();

    /* ── Build the message ──────────────────────────────────── */

    const lines = [];

    /* Header */
    lines.push(`*🏡 VINTEX GUEST HOUSE*`);
    lines.push(`_Kimana, Kajiado · Kenya_`);
    lines.push(DLINE);
    lines.push('');
    lines.push(`*📋 ROOM BOOKING ENQUIRY*`);
    lines.push(`Date Sent: ${todayLabel()}`);
    lines.push('');

    /* Room list */
    lines.push(`*🛏️ SELECTED ROOMS*`);
    lines.push(LINE);

    items.forEach((item, idx) => {
      const subtotal = item.price * item.qty;
      lines.push(`${idx + 1}. *${item.name}*`);
      lines.push(`   Qty: ${item.qty} room${item.qty !== 1 ? 's' : ''}`);
      lines.push(`   Rate: ${formatKES(item.price)} per room/night`);
      lines.push(`   Subtotal: ${formatKES(subtotal)}`);
      if (idx < items.length - 1) lines.push('');
    });

    lines.push('');
    lines.push(LINE);

    /* Totals */
    lines.push(`*Total Rooms:* ${totalRooms}`);
    lines.push(`*Estimated Total (1 night):* ${formatKES(totalPrice)}`);
    lines.push('');

    /* Customised requests */
    if (notes) {
      lines.push(`*✏️ CUSTOMIZED REQUESTS*`);
      lines.push(LINE);
      lines.push(notes);
      lines.push('');
    }

    /* Footer */
    lines.push(DLINE);
    lines.push(`_Please confirm availability and provide_`);
    lines.push(`_check-in / check-out dates. Thank you!_ 🙏`);

    const message = lines.join('\n');

    /* ── Encode & redirect ──────────────────────────────────── */

    const encoded = encodeURIComponent(message);
    const url     = `https://wa.me/${waNumber}?text=${encoded}`;

    /*
     * On mobile: opens WhatsApp directly.
     * On desktop: opens WhatsApp Web in a new tab.
     */
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /* ── Expose globally ────────────────────────────────────────── */
  window.sendVintexWhatsApp = sendVintexWhatsApp;

  /* ══════════════════════════════════════════════════════════════
     STANDALONE QUICK-ENQUIRY (event / conference pages)
     Called by direct WhatsApp links that bypass the cart.
  ══════════════════════════════════════════════════════════════ */

  function sendEventEnquiry(eventType, waNumber) {
    const num = waNumber || (window.VINTEX_WA_NUM || '254700000000');
    const templates = {
      conference: [
        `*🎤 CONFERENCE / MEETING ROOM ENQUIRY*`,
        ``,
        `Hello Vintex Guest House,`,
        ``,
        `I would like to enquire about booking your *conference / meeting room*.`,
        ``,
        `Please provide details on:`,
        `• Available dates`,
        `• Capacity options`,
        `• Tea-break & lunch packages`,
        `• Equipment included (projector, PA, Wi-Fi)`,
        `• Pricing per session / full day`,
        ``,
        `_Sent via vintexguesthouse.co.ke_`
      ],
      event: [
        `*🎉 PRIVATE EVENT / CELEBRATION ENQUIRY*`,
        ``,
        `Hello Vintex Guest House,`,
        ``,
        `I would like to enquire about hosting a *private event* at your venue.`,
        ``,
        `Please share information on:`,
        `• Available dates & venue capacity`,
        `• Catering options`,
        `• Décor & tent / canopy arrangements`,
        `• Sound system availability`,
        `• Pricing`,
        ``,
        `_Sent via vintexguesthouse.co.ke_`
      ]
    };

    const msg     = (templates[eventType] || templates['event']).join('\n');
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${num}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }

  window.sendEventEnquiry = sendEventEnquiry;

})();
