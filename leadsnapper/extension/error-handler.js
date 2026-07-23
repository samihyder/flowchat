window.onerror = function (msg, src, line, col, err) {
  document.body.innerHTML =
    '<div style="padding:20px;color:#dc2626;font-family:monospace;font-size:12px">' +
    '<b>LeadSnapper error</b><br>' + msg +
    '<br><small>' + (src || '') + ':' + line + '</small>' +
    (err ? '<br><pre style="white-space:pre-wrap;margin-top:8px">' + err.stack + '</pre>' : '') +
    '</div>';
};
window.addEventListener('unhandledrejection', function (e) {
  document.body.innerHTML =
    '<div style="padding:20px;color:#dc2626;font-family:monospace;font-size:12px">' +
    '<b>Unhandled promise rejection</b><br>' +
    (e.reason ? String(e.reason) : 'unknown') + '</div>';
});
