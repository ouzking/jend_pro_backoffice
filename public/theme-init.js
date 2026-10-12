// Applies the saved theme before first paint (no flash). External file so the
// Content-Security-Policy can forbid inline scripts (script-src 'self').
try {
  var t = localStorage.getItem('jendpro.theme')
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
} catch (e) {}
