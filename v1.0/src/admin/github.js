/**
 * GitHub Contents API 封装（浏览器端）
 * 关键点：更新与删除必须带 blob sha，否则 409
 */
(function () {
  var H = window.__HUT__ || {};
  var API = 'https://api.github.com';

  function getToken() {
    try { return sessionStorage.getItem('hut_token') || localStorage.getItem('hut_token') || ''; }
    catch (e) { return ''; }
  }
  function setToken(t, remember) {
    try {
      sessionStorage.setItem('hut_token', t);
      if (remember) localStorage.setItem('hut_token', t);
      else localStorage.removeItem('hut_token');
    } catch (e) {}
  }
  function clearToken() {
    try { sessionStorage.removeItem('hut_token'); localStorage.removeItem('hut_token'); } catch (e) {}
  }

  function headers() {
    return {
      Authorization: 'Bearer ' + getToken(),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  /** 路径逐段编码（中文/空格安全） */
  function encPath(p) {
    return String(p).split('/').map(encodeURIComponent).join('/');
  }

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
    var res = await fetch(url, options);
    var json = null;
    try { json = await res.json(); } catch (e) {}
    if (!res.ok) {
      var msg = (json && json.message) || ('HTTP ' + res.status);
      var err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  var base = function () { return API + '/repos/' + H.owner + '/' + H.repo + '/contents/'; };

  /** 列出文章目录（含每个文件的 sha） */
  async function list() {
    var j = await req(base() + encPath(H.postsDir) + '?ref=' + encodeURIComponent(H.branch), { headers: headers() });
    if (!Array.isArray(j)) return [];
    return j
      .filter(function (f) { return f.type === 'file' && /\.md$/i.test(f.name); })
      .map(function (f) { return { name: f.name, path: f.path, sha: f.sha, size: f.size }; });
  }

  /** 读取单个文件（返回 { text, sha }） */
  async function read(path) {
    var j = await req(base() + encPath(path) + '?ref=' + encodeURIComponent(H.branch), { headers: headers() });
    return { text: b64dec(j.content || ''), sha: j.sha };
  }

  /** 新建（无 sha）或更新（必须带 sha） */
  async function save(path, text, sha, message) {
    var body = { message: message, content: b64enc(text), branch: H.branch };
    if (sha) body.sha = sha;
    var j = await req(base() + encPath(path), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
    return { sha: j.content && j.content.sha, commit: j.commit && j.commit.sha };
  }

  /** 删除（必须带 sha） */
  async function remove(path, sha, message) {
    await req(base() + encPath(path), {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ message: message, sha: sha, branch: H.branch }),
    });
  }

  /** 校验 Token 是否有效 */
  async function verify() {
    var j = await req(API + '/repos/' + H.owner + '/' + H.repo, { headers: headers() });
    return j && j.full_name ? j.full_name : '';
  }

  window.GH = {
    list: list, read: read, save: save, remove: remove, verify: verify,
    getToken: getToken, setToken: setToken, clearToken: clearToken,
    config: H,
  };
})();
