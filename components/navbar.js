// ===== SHARED NAVBAR BEHAVIOR =====

// Mobile menu
function toggleMobileMenu() {
  var m = document.getElementById('mobileMenu');
  if (!m) return;
  m.classList.toggle('active');
  document.body.style.overflow = document.body.style.overflow === 'hidden' ? '' : 'hidden';
}

// Language dropdown
function toggleLangDropdown() {
  var dd = document.getElementById('langDropdown');
  var btn = document.getElementById('langToggleBtn');
  if (dd) dd.classList.toggle('open');
  if (btn) btn.classList.toggle('open');
}
function switchLang(lang) {
  var dd = document.getElementById('langDropdown');
  var btn = document.getElementById('langToggleBtn');
  if (dd) dd.classList.remove('open');
  if (btn) btn.classList.remove('open');
  if (typeof I18N !== 'undefined' && I18N.toggle) I18N.toggle(lang);
}
document.addEventListener('click', function(e) {
  var dd = document.getElementById('langDropdown');
  var btn = document.getElementById('langToggleBtn');
  if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) {
    dd.classList.remove('open');
    btn.classList.remove('open');
  }
});

// Smart collapse
(function() {
  var nav = document.getElementById('navbar');
  var hero = document.getElementById('hero');
  if (!nav) return;
  var SCROLL_THRESHOLD = 80;
  var INACTIVITY_DELAY = 4000;
  var isCollapsed = false;
  var heroVisible = false;
  var manualExpand = false;
  var scrollTicking = false;
  var inactivityTimer = null;

  function collapseNavbar() {
    if (isCollapsed) return;
    nav.classList.remove('scrolled');
    nav.classList.add('collapsed');
    isCollapsed = true;
    manualExpand = false;
    clearTimeout(inactivityTimer);
  }
  function expandNavbar(manual) {
    if (!isCollapsed) return;
    nav.classList.remove('collapsed');
    if (window.scrollY > 10) nav.classList.add('scrolled');
    isCollapsed = false;
    manualExpand = !!manual;
    if (manual) {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(collapseNavbar, INACTIVITY_DELAY);
    }
  }
  function resetInactivityTimer() {
    if (!manualExpand || isCollapsed) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(collapseNavbar, INACTIVITY_DELAY);
  }

  if (hero) {
    var ro = new IntersectionObserver(function(entries) {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible && isCollapsed) expandNavbar(false);
      else if (!heroVisible && !isCollapsed && !manualExpand && window.scrollY >= SCROLL_THRESHOLD) collapseNavbar();
    }, { threshold: 0.1 });
    ro.observe(hero);
  }

  window.addEventListener('scroll', function() {
    if (!scrollTicking) {
      requestAnimationFrame(function() {
        var sy = window.scrollY;
        nav.classList.toggle('scrolled', sy > 10 && !isCollapsed);
        var bt = document.getElementById('backTop');
        if (bt) bt.classList.toggle('visible', sy > 400);
        if (sy >= SCROLL_THRESHOLD && !heroVisible && !isCollapsed && !manualExpand) collapseNavbar();
        else if (sy < SCROLL_THRESHOLD && isCollapsed && heroVisible) expandNavbar(false);
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  });

  nav.addEventListener('click', function(e) {
    if (isCollapsed) { e.preventDefault(); e.stopPropagation(); expandNavbar(true); }
    else resetInactivityTimer();
  });

  var mmTimer;
  nav.addEventListener('mousemove', function() {
    if (!isCollapsed && manualExpand) { clearTimeout(mmTimer); mmTimer = setTimeout(resetInactivityTimer, 80); }
  });
  nav.addEventListener('mouseenter', function() { if (!isCollapsed) resetInactivityTimer(); });
  nav.addEventListener('mouseleave', function() {
    if (!isCollapsed && manualExpand) {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(collapseNavbar, INACTIVITY_DELAY);
    }
  });
  document.addEventListener('click', function() { if (!isCollapsed && manualExpand) resetInactivityTimer(); });
  document.addEventListener('keydown', function() { if (!isCollapsed && manualExpand) resetInactivityTimer(); });
  document.addEventListener('touchstart', function() { if (!isCollapsed && manualExpand) resetInactivityTimer(); });

  if (window.scrollY >= SCROLL_THRESHOLD) {
    requestAnimationFrame(function() { if (!heroVisible) collapseNavbar(); });
  }
})();
