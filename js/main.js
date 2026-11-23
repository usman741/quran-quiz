(function () {
  'use strict';
  // Mobile drawer toggle
  var burger = document.querySelector('.ljq-burger');
  var drawer = document.getElementById('ljq-drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      drawer.hidden = open;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) {
        burger.click();
        burger.focus();
      }
    });
  }
})();
