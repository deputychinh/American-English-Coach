// Applies the saved theme before first paint (no flash); the toggle keeps it in sync.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('coach.theme') || 'null');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    var lang = JSON.parse(localStorage.getItem('coach.language') || 'null');
    if (lang === 'en' || lang === 'vi') document.documentElement.lang = lang;
  } catch (e) {
    /* storage blocked: default light */
  }
})();
