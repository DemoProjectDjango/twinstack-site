/* Progressive enhancement only. The site works with JavaScript disabled.
   Visual state is expressed as data attributes so Tailwind variants
   (data-[open=false]:hidden) do the styling, not JavaScript. */
(function () {
  'use strict';

  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('primary-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        nav.setAttribute('data-open', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Dropdowns open on hover and focus in CSS; this adds arrow-key entry.
  document.querySelectorAll('.group > a').forEach(function (link) {
    var panel = link.parentElement.querySelector('ul');
    if (!panel) return;
    link.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        var first = panel.querySelector('a');
        if (first) first.focus();
      }
    });
  });
})();
