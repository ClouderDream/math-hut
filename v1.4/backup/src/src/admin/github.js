/**
 * GitHub Contents API 封装（浏览器端）
 *
 * 凭据策略（v1.2 安全加固）：
 * - sessionStorage 始终保存当前会话的 Token
 * - 勾选「信任此电脑 30 天」后，Token 额外写入 localStorage 并记录 expires
 * - 读取时先看 session；没有则看 localStorage，但仅当未过期（≤ 30 天）才采用
 * - 过期、主动退出、GitHub 401/403 任一情况都自动 clearToken
 * - 不保存管理口令明文
 */
(function () {
  var H = window.__HUT__ || {};
  var API = 'https://api.github.com';

  var TOKEN_KEY = 'hut_token';
  var EXPIRES_KEY = 'hut_token_expires';
  var TRUST_DAYS = 30;

  function getToken() {
    try {
      var sessionToken = sessionStorage.getItem(TOKEN_KEY);
      if (sessionToken) return sessionToken;

      var token = localStorage.getItem(TOKEN_KEY);
      var expires = Number(localStorage.getItem(EXPIRES_KEY) || 0);
      if (!token) return '';
      if (!expires || Date.now() > expires) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRES_KEY);
        return '';
      }
      // 将持久化 Token 提升到 sessionStorage 供本次会话使用
      sessionStorage.setItem(TOKEN_KEY, token);
      return token;
    } catch (e) { return ''; }
  }

  function setToken(t, remember) {
    try {
      sessionStorage.setItem(TOKEN_KEY, t);
      if (remember) {
        var expires = Date.now() + TRUST_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(TOKEN_KEY, t);
        localStorage.setItem(EXPIRES_KEY, String(expires));
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRES_KEY);
      }
    } catch (e) {}
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRES_KEY);
    } catch (e) {}
  }

  /** 暴露给 admin.js 用来在 UI 展示剩余天数 */
  function trustInfo() {
    try {
      var expires = Number(localStorage.getItem(EXPIRES_KEY) || 0);
      if (!expires) return { active: false };
      var remaining = expires - Date.now();
      return {
        active: remaining > 0,
        expiresAt: expires,
        remainingDays: Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000))),
      };
    } catch (e) { return { active: false }; }
  }

  function headers() {
    return {
      Authorization: 'Bearer ' + getToken(),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  function encPath(p) { return String(p).split('/').map(encodeURIComponent).join('/'); }

  function b64enc(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64dec(b64) {
    var bin = atob(String(b64).replace(/\n/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function req(url, options) {
    options = options || {};
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    options.signal = controller.signal;
    try {
      var res = await fetch(url, options);
      clearTimeout(timer);
      var json = null;
      try { json = await res.json(); } catch (e) {}
      if (!res.ok) {
        var msg = (json && json.message) || ('HTTP ' + res.status);
        var err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return json;
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        var toErr = new Error('请求超时（20s），请检查网络连接或稍后重试');
        toErr.status = 0;
        throw toErr;
      }
      throw e;
    }
  }

  var base = function () { return API + '/repos/' + H.owner + '/' + H.repo + '/contents/'; };

  /** 列出目录 */
  async function listDir(dir) {
    var j = await req(base() + encPath(dir) + '?ref=' + encodeURIComponent(H.branch), { headers: headers() });
    return Array.isArray(j) ? j : [];
  }

  /** 读取文本文件 */
  async function read(path) {
    var j = await req(base() + encPath(path) + '?ref=' + encodeURIComponent(H.branch), { headers: headers() });
    return { text: b64dec(j.content || ''), sha: j.sha };
  }

  /** 保存文本文件 */
  async function save(path, text, sha, message) {
    var body = { message: message, content: b64enc(text), branch: H.branch };
    if (sha) body.sha = sha;
    var j = await req(base() + encPath(path), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
    return { sha: j.content && j.content.sha, commit: j.commit && j.commit.sha };
  }

  /** 删除文件 */
  async function remove(path, sha, message) {
    await req(base() + encPath(path), {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ message: message, sha: sha, branch: H.branch }),
    });
  }

  /** 保存二进制文件（content 已是 base64） */
  async function saveBinary(path, b64content, sha, message) {
    var body = { message: message, content: b64content, branch: H.branch };
    if (sha) body.sha = sha;
    var j = await req(base() + encPath(path), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
    return { sha: j.content && j.content.sha, commit: j.commit && j.commit.sha };
  }

  async function verify() {
    var j = await req(API + '/repos/' + H.owner + '/' + H.repo, { headers: headers() });
    return j && j.full_name ? j.full_name : '';
  }

  window.GH = {
    listDir: listDir, read: read, save: save, remove: remove, saveBinary: saveBinary, verify: verify,
    getToken: getToken, setToken: setToken, clearToken: clearToken, trustInfo: trustInfo,
    config: H,
  };
})();
