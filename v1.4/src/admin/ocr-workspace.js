/** V1.4 免费本地 OCR 工作区：异步 PaddleOCR + 双栏校对 + 可视化草图裁切。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }

  var ENDPOINT_KEY = 'hut_local_ocr_endpoint';
  var state = {
    file: null, objectUrl: '', busy: false, currentJobId: '',
    sketchSvg: '', sketchTikz: '', cropDataUrl: '', cropVectorizable: false,
    syncLock: false, cropDrag: null
  };

  function endpoint() {
    var el = $('ocrEndpoint');
    var v = (el && el.value || '').trim() || 'http://127.0.0.1:8765';
    return v.replace(/\/+$/, '');
  }

  function addStyle() {
    if ($('ocrWorkspaceStyle')) return;
    var s = document.createElement('style');
    s.id = 'ocrWorkspaceStyle';
    s.textContent = `
      .admin-app.admin-ocr-mode{grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important;grid-template-areas:"header" "main"!important}
      .admin-app.admin-ocr-mode .admin-side{display:none!important}
      .ocr-page{max-width:1680px;margin:0 auto;display:grid;gap:16px}
      .ocr-hero,.ocr-card{border:1px solid var(--admin-border);background:var(--admin-surface);border-radius:12px;padding:18px;min-width:0}
      .ocr-hero{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .ocr-hero h3,.ocr-card h4{margin:0 0 6px}.ocr-hero p,.ocr-card p{margin:0;color:var(--admin-muted)}
      .ocr-service{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:10px;align-items:end;margin-top:14px}
      .ocr-service .field{margin:0}.ocr-badge{display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border:1px solid var(--admin-border);border-radius:999px;color:var(--admin-muted);white-space:nowrap}.ocr-badge.ok{color:#176b3a;border-color:#95c4a8;background:rgba(64,150,92,.08)}.ocr-badge.bad{color:#9d3b31;border-color:#d5aaa5;background:rgba(170,65,50,.06)}
      .ocr-work{display:grid;grid-template-columns:minmax(260px,.54fr) minmax(680px,1.46fr);gap:16px;align-items:stretch}
      .ocr-upload-card,.ocr-result-card{height:100%;box-sizing:border-box}
      .ocr-upload-card{display:flex;flex-direction:column}
      .ocr-drop{position:relative;min-height:210px;flex:1;border:1.5px dashed var(--admin-border);border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;cursor:pointer;background:var(--admin-bg);overflow:hidden}
      .ocr-drop.drag{border-color:var(--admin-accent);background:rgba(52,64,107,.06)}.ocr-drop img{max-width:100%;max-height:440px;object-fit:contain;border-radius:6px}
      .ocr-file-meta{margin-top:10px;font-size:12px;color:var(--admin-muted);word-break:break-all}.ocr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ocr-actions .btn{min-width:106px}
      .ocr-progress{height:7px;background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:999px;overflow:hidden;margin-top:12px}.ocr-progress>i{display:block;height:100%;width:0;background:var(--admin-accent);transition:width .25s ease}.ocr-status{min-height:22px;margin-top:8px;font-size:12px;color:var(--admin-muted)}
      .ocr-result-card{display:flex;flex-direction:column}.ocr-result-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}
      .ocr-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;flex:1;min-height:0}
      .ocr-result-pane{display:flex;flex-direction:column;min-width:0;min-height:0}.ocr-pane-head{font-size:12px;font-weight:600;color:var(--admin-muted);margin:0 0 6px}
      .ocr-result-pane textarea,.ocr-preview{width:100%;height:520px;min-height:420px;box-sizing:border-box;border:1px solid var(--admin-border);border-radius:8px;padding:14px;background:var(--admin-bg);color:inherit;overflow:auto}
      .ocr-result-pane textarea{resize:none;font:13px/1.75 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.ocr-preview{background:#fff;line-height:1.75}.ocr-preview img{max-width:100%}
      .ocr-sync-note{font-size:11px;color:var(--admin-muted);margin-top:7px}
      .ocr-sketch-layout{display:grid;grid-template-columns:minmax(360px,.95fr) minmax(420px,1.05fr);gap:16px;margin-top:14px;align-items:start}
      .ocr-crop-viewport{min-height:300px;border:1px solid var(--admin-border);border-radius:10px;background:var(--admin-bg);padding:12px;display:flex;align-items:center;justify-content:center;overflow:auto}
      .ocr-crop-stage{position:relative;display:inline-block;max-width:100%;touch-action:none;user-select:none;cursor:crosshair}.ocr-crop-stage img{display:block;max-width:100%;max-height:520px;width:auto;height:auto}
      .ocr-crop-selection{position:absolute;border:2px solid #c54034;background:rgba(197,64,52,.08);box-shadow:0 0 0 9999px rgba(255,255,255,.34);pointer-events:none;box-sizing:border-box}
      .ocr-crop-help{font-size:12px;line-height:1.7;color:var(--admin-muted);margin-top:8px}
      .ocr-crop-grid{display:grid;grid-template-columns:repeat(4,minmax(70px,1fr));gap:8px;margin-top:10px}.ocr-crop-grid .field{margin:0}
      .ocr-sketch-truth{min-height:300px;border:1px solid var(--admin-border);border-radius:10px;background:#fff;padding:12px;display:flex;align-items:center;justify-content:center;overflow:auto}.ocr-sketch-truth img{max-width:100%;max-height:520px}
      .ocr-vector-state{margin-top:10px;padding:10px 12px;border-left:3px solid #8f7753;background:rgba(143,119,83,.07);font-size:12px;line-height:1.7;color:var(--admin-muted)}.ocr-vector-state.ok{border-left-color:#4c8a61;background:rgba(76,138,97,.07);color:#315e40}
      .ocr-sketch-code{margin-top:12px}.ocr-sketch-output{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.ocr-sketch-output textarea{width:100%;min-height:220px;resize:vertical;border:1px solid var(--admin-border);border-radius:8px;padding:12px;background:var(--admin-bg);font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-sizing:border-box}
      @media(max-width:1180px){.ocr-service{grid-template-columns:1fr auto auto}.ocr-work{grid-template-columns:minmax(250px,.62fr) minmax(560px,1.38fr)}.ocr-result-pane textarea,.ocr-preview{height:470px}}
      @media(max-width:980px){.ocr-service{grid-template-columns:1fr}.ocr-work,.ocr-sketch-layout{grid-template-columns:1fr}.ocr-upload-card,.ocr-result-card{height:auto}.ocr-drop{min-height:260px}.ocr-result-pane textarea,.ocr-preview{height:420px}}
      @media(max-width:720px){.ocr-result-grid,.ocr-sketch-output{grid-template-columns:1fr}.ocr-result-pane textarea,.ocr-preview{height:360px}.ocr-crop-grid{grid-template-columns:1fr 1fr}.ocr-hero{align-items:flex-start;flex-direction:column}.ocr-card,.ocr-hero{padding:14px}.ocr-actions .btn{flex:1 1 42%}}
    `;
    document.head.appendChild(s);
  }

  function panelHtml() {
    return '<div class="ocr-page">' +
      '<section class="ocr-hero"><div><h3>本地 OCR · V1.4</h3><p>图片/PDF → Markdown + 实时预览；草图先精确框选，再按复杂度决定裁切图、SVG 或 TikZ。</p></div><button class="btn ghost" type="button" id="ocrBackToArticle">返回文章编辑</button></section>' +
      '<section class="ocr-card"><h4>本地识别服务</h4><p>识别在本机完成，不需要付费 OCR API。</p><div class="ocr-service"><label class="field"><span>服务地址</span><input id="ocrEndpoint" value="http://127.0.0.1:8765" spellcheck="false"></label><button class="btn ghost" type="button" id="ocrCheckService">检查连接</button><span class="ocr-badge" id="ocrServiceBadge">未检查</span></div></section>' +
      '<div class="ocr-work">' +
        '<section class="ocr-card ocr-upload-card"><h4>1. 上传原稿</h4><p>支持 JPG / PNG / WebP / TIFF / PDF。结果只作为初稿。</p><div class="ocr-drop" id="ocrDrop"><div id="ocrDropHint"><strong>拖入文件，或点击选择</strong><br><small>建议拍正、光线均匀、公式清晰</small></div><img id="ocrImagePreview" alt="原稿预览" hidden></div><input id="ocrFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff,application/pdf" hidden><div class="ocr-file-meta" id="ocrFileMeta">尚未选择文件</div><div class="ocr-actions"><button class="btn primary" type="button" id="ocrRecognize">识别并初排版</button><button class="btn ghost" type="button" id="ocrClear">清空</button></div><div class="ocr-progress"><i id="ocrProgressFill"></i></div><div class="ocr-status" id="ocrStatus">等待上传</div></section>' +
        '<section class="ocr-card ocr-result-card"><div class="ocr-result-head"><div><h4>2. 校对与排版</h4><span class="ocr-file-meta">左侧改 Markdown，右侧实时预览；两栏滚轮按阅读进度同步。</span></div></div><div class="ocr-result-grid"><div class="ocr-result-pane"><div class="ocr-pane-head">Markdown 源码</div><textarea id="ocrResult" spellcheck="false" placeholder="本地 OCR 结果会出现在这里。"></textarea></div><div class="ocr-result-pane"><div class="ocr-pane-head">实时预览</div><div class="ocr-preview post-body" id="ocrPreview"></div></div></div><div class="ocr-sync-note">同步滚动按相对阅读进度映射；编辑 Markdown 后预览自动刷新。</div><div class="ocr-actions"><button class="btn primary" type="button" id="ocrInsert">插入当前文章</button><button class="btn ghost" type="button" id="ocrReplace">替换当前正文</button><button class="btn ghost" type="button" id="ocrCopy">复制 Markdown</button></div></section>' +
      '</div>' +
      '<section class="ocr-card"><h4>3. 草图处理</h4><p>直接在原图上拖拽框选草图。右侧始终先显示真实裁切结果；只有选区足够简单时才提供 SVG/TikZ，避免把文字笔画误识别成几何图。</p><div class="ocr-sketch-layout"><div><div class="ocr-crop-viewport"><div class="ocr-crop-stage" id="ocrCropStage" hidden><img id="ocrCropImage" alt="草图框选原图"><div class="ocr-crop-selection" id="ocrCropSelection"></div></div><div id="ocrCropEmpty">请先上传一张图片</div></div><div class="ocr-crop-help">鼠标或触控拖拽红框选择草图区域。下面百分比会自动更新，也可以手工精调。</div><div class="ocr-crop-grid"><label class="field"><span>X %</span><input id="cropX" type="number" min="0" max="99" step="0.1" value="0"></label><label class="field"><span>Y %</span><input id="cropY" type="number" min="0" max="99" step="0.1" value="0"></label><label class="field"><span>宽 %</span><input id="cropW" type="number" min="1" max="100" step="0.1" value="100"></label><label class="field"><span>高 %</span><input id="cropH" type="number" min="1" max="100" step="0.1" value="100"></label></div><div class="ocr-actions"><button class="btn ghost" type="button" id="ocrCropReset">重置整页</button><button class="btn primary" type="button" id="ocrSketchRun">分析所选草图</button></div></div><div><div class="ocr-pane-head">真实裁切预览</div><div class="ocr-sketch-truth" id="ocrSketchPreview">尚未分析选区</div><div class="ocr-vector-state" id="ocrSketchHint">先框选实际草图，再点击“分析所选草图”。</div><div class="ocr-actions"><button class="btn primary" type="button" id="ocrSaveCrop" disabled>保存裁切 PNG 并插入正文</button><button class="btn ghost" type="button" id="ocrSaveSvg" disabled>保存 SVG 并插入正文</button><button class="btn ghost" type="button" id="ocrCopyTikz" disabled>复制 TikZ</button></div><details class="ocr-sketch-code"><summary>查看 SVG / TikZ 代码</summary><div class="ocr-sketch-output"><textarea id="ocrSvgResult" placeholder="简单图形才会生成 SVG" spellcheck="false"></textarea><textarea id="ocrTikzResult" placeholder="简单图形才会生成 TikZ" spellcheck="false"></textarea></div></details></div></div></section>' +
    '</div>';
  }

  function inject() {
    var tabs = document.querySelector('.admin-header .tabs');
    if (tabs && !tabs.querySelector('[data-tab="ocr"]')) {
      var b = document.createElement('button'); b.className = 'tab'; b.dataset.tab = 'ocr'; b.textContent = 'OCR 导入'; b.title = '免费本地 OCR / 草图导入';
      var media = tabs.querySelector('[data-tab="media"]'); tabs.insertBefore(b, media || null);
    }
    if (!$('tab-ocr')) {
      var main = $('mainArea'); if (!main) return;
      var panel = document.createElement('div'); panel.id = 'tab-ocr'; panel.hidden = true; panel.innerHTML = panelHtml(); main.appendChild(panel);
    }
    try { var saved = localStorage.getItem(ENDPOINT_KEY); if (saved && $('ocrEndpoint')) $('ocrEndpoint').value = saved; } catch (_) {}
    bindSyncScroll();
    bindCropSelector();
  }

  function setOcrMode(on) {
    var app = $('appView'); if (!app) return;
    app.classList.toggle('admin-ocr-mode', !!on);
    var panel = $('tab-ocr'); if (panel) panel.hidden = !on;
    if (on) {
      ['tab-articles','tab-media','tab-settings','tab-shortcuts'].forEach(function (id) { var el = $(id); if (el) el.hidden = true; });
      document.querySelectorAll('.tab[data-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === 'ocr'); });
      if ($('headerTitle')) $('headerTitle').textContent = 'OCR 导入';
      if ($('newBtn')) $('newBtn').hidden = true;
    }
  }

  function progress(p, text, error) {
    if ($('ocrProgressFill')) $('ocrProgressFill').style.width = Math.max(0, Math.min(100, p)) + '%';
    if ($('ocrStatus')) { $('ocrStatus').textContent = text || ''; $('ocrStatus').style.color = error ? '#a33' : ''; }
    if (window.HUTProgress) { if (error) window.HUTProgress.error(text || '失败'); else if (p >= 100) window.HUTProgress.done(text || '完成'); else window.HUTProgress.set(p, text || '处理中…'); }
  }

  async function fetchWithTimeout(url, options, ms, label) {
    var ctl = new AbortController(), timedOut = false, t = null;
    if (ms && ms > 0) t = setTimeout(function () { timedOut = true; ctl.abort(); }, ms);
    options = Object.assign({}, options || {}, { signal: ctl.signal });
    try { return await fetch(url, options); }
    catch (e) {
      var message = String((e && e.message) || e || '');
      if (timedOut) throw new Error((label || '请求') + '超时。');
      if ((e && e.name === 'AbortError') || /aborted|abort/i.test(message)) throw new Error((label || '请求') + '被浏览器中断。');
      throw e;
    } finally { if (t) clearTimeout(t); }
  }

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function elapsedText(startedAt) {
    var sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    return sec < 60 ? sec + ' 秒' : Math.floor(sec / 60) + ' 分 ' + (sec % 60) + ' 秒';
  }

  async function checkService() {
    var badge = $('ocrServiceBadge');
    try {
      if (badge) { badge.textContent = '检查中…'; badge.className = 'ocr-badge'; }
      var res = await fetchWithTimeout(endpoint() + '/health', {}, 5000, '健康检查');
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error('HTTP ' + res.status);
      if (badge) { badge.textContent = '● 已连接 · ' + (data.engine || 'Local OCR'); badge.className = 'ocr-badge ok'; }
      try { localStorage.setItem(ENDPOINT_KEY, endpoint()); } catch (_) {}
      return true;
    } catch (e) {
      if (badge) { badge.textContent = '● 未连接'; badge.className = 'ocr-badge bad'; }
      progress(0, '本地 OCR 未启动或无法访问', true);
      return false;
    }
  }

  function setFile(file) {
    if (!file) return;
    var ok = /^image\//.test(file.type) || /\.pdf$/i.test(file.name || '');
    if (!ok) { progress(0, '仅支持图片或 PDF。', true); return; }
    state.file = file;
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(file);
    var img = $('ocrImagePreview'), hint = $('ocrDropHint'), cropImg = $('ocrCropImage'), cropStage = $('ocrCropStage'), cropEmpty = $('ocrCropEmpty');
    if (/^image\//.test(file.type)) {
      img.src = state.objectUrl; img.hidden = false; if (hint) hint.hidden = true;
      if (cropImg) cropImg.src = state.objectUrl;
      if (cropStage) cropStage.hidden = false;
      if (cropEmpty) cropEmpty.hidden = true;
      if (cropImg) cropImg.onload = function () { resetCrop(); };
    } else {
      img.hidden = true; img.removeAttribute('src');
      if (hint) { hint.hidden = false; hint.innerHTML = '<strong>PDF 已选择</strong><br><small>将按全部页面解析</small>'; }
      if (cropStage) cropStage.hidden = true; if (cropEmpty) { cropEmpty.hidden = false; cropEmpty.textContent = 'PDF 暂不支持草图框选，请先导出目标页为图片'; }
    }
    if ($('ocrFileMeta')) $('ocrFileMeta').textContent = file.name + ' · ' + (file.size / 1024 / 1024).toFixed(2) + ' MB';
    clearSketchResult();
    progress(0, '文件已就绪');
  }

  function renderPreview() {
    var text = $('ocrResult') ? $('ocrResult').value : '', box = $('ocrPreview'); if (!box) return;
    var ratio = box.scrollHeight > box.clientHeight ? box.scrollTop / (box.scrollHeight - box.clientHeight) : 0;
    try {
      var md = window.markdownit ? window.markdownit({html:false,linkify:true}) : null;
      if (md && window.mdMath) window.mdMath(md,{katex:window.katex,macros:H.macros||{}});
      box.innerHTML = md ? md.render(text) : '<pre>' + esc(text) + '</pre>';
    } catch(e) { box.innerHTML = '<pre>' + esc(text) + '</pre>'; }
    if (ratio > 0 && box.scrollHeight > box.clientHeight) box.scrollTop = ratio * (box.scrollHeight - box.clientHeight);
  }

  function bindSyncScroll() {
    var source = $('ocrResult'), preview = $('ocrPreview');
    if (!source || !preview || source.dataset.syncBound) return;
    source.dataset.syncBound = '1';
    function mirror(from, to) {
      if (state.syncLock) return;
      state.syncLock = true;
      var fromMax = Math.max(1, from.scrollHeight - from.clientHeight);
      var toMax = Math.max(0, to.scrollHeight - to.clientHeight);
      to.scrollTop = (from.scrollTop / fromMax) * toMax;
      requestAnimationFrame(function () { state.syncLock = false; });
    }
    source.addEventListener('scroll', function () { mirror(source, preview); }, {passive:true});
    preview.addEventListener('scroll', function () { mirror(preview, source); }, {passive:true});
    source.addEventListener('input', renderPreview);
  }

  async function runLegacyOcr(form) {
    progress(18, '本地服务为旧版本，使用兼容识别模式…');
    var res = await fetchWithTimeout(endpoint() + '/ocr', { method: 'POST', body: form }, 30 * 60 * 1000, 'OCR 识别');
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.detail || ('HTTP ' + res.status));
    return data.markdown || '';
  }

  async function pollOcrJob(jobId) {
    var startedAt = Date.now(), consecutiveFailures = 0;
    while (state.busy && state.currentJobId === jobId) {
      await sleep(2200);
      try {
        var res = await fetchWithTimeout(endpoint() + '/ocr/status/' + encodeURIComponent(jobId), {}, 12000, 'OCR 状态检查');
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.detail || ('HTTP ' + res.status));
        consecutiveFailures = 0;
        if (data.status === 'done') return data.markdown || '';
        if (data.status === 'error') throw new Error(data.error || '本机 OCR 执行失败');
        var elapsed = elapsedText(startedAt);
        if (data.status === 'queued') progress(22, 'OCR 已排队 · ' + elapsed);
        else {
          var seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
          progress(Math.min(90, 35 + Math.floor(seconds / 20)), 'PP-StructureV3 正在识别 · ' + elapsed);
        }
      } catch (e) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 5) throw new Error('连续 5 次无法读取 OCR 状态：' + (e.message || e));
        progress(30, '状态检查暂时失败，自动重试（' + consecutiveFailures + '/5）');
      }
    }
    throw new Error('OCR 任务已停止');
  }

  async function runOcr() {
    if (state.busy) return;
    if (!state.file) { progress(0, '请先选择图片或 PDF。', true); return; }
    if (!(await checkService())) return;
    state.busy = true; state.currentJobId = ''; $('ocrRecognize').disabled = true;
    try {
      progress(8, '正在创建本机 OCR 任务…');
      var form = new FormData(); form.append('file', state.file, state.file.name);
      var startRes = await fetchWithTimeout(endpoint() + '/ocr/start', { method: 'POST', body: form }, 60000, '创建 OCR 任务');
      var markdown = '';
      if (startRes.status === 404 || startRes.status === 405) markdown = await runLegacyOcr(form);
      else {
        var startData = await startRes.json().catch(function () { return {}; });
        if (!startRes.ok) throw new Error(startData.detail || ('HTTP ' + startRes.status));
        if (!startData.job_id) throw new Error('本地服务未返回 OCR 任务编号');
        state.currentJobId = startData.job_id;
        progress(18, 'OCR 任务已创建');
        markdown = await pollOcrJob(startData.job_id);
      }
      $('ocrResult').value = markdown || ''; renderPreview(); progress(100, 'OCR 完成，请对照原稿校对');
    } catch (e) { progress(100, 'OCR 失败：' + (e.message || e), true); }
    finally { state.busy = false; state.currentJobId = ''; $('ocrRecognize').disabled = false; }
  }

  function insertIntoArticle(replace) {
    var ta=$('fBody'),src=$('ocrResult'); if(!ta||!src)return;
    var text=src.value.trim(); if(!text){progress(0,'没有可插入结果',true);return;}
    if(replace){if(ta.value.trim()&&!confirm('将用 OCR 结果替换当前正文，是否继续？'))return;ta.value=text;}
    else{var s=ta.selectionStart==null?ta.value.length:ta.selectionStart,e=ta.selectionEnd==null?s:ta.selectionEnd;ta.value=ta.value.slice(0,s)+(s?'\n\n':'')+text+(e<ta.value.length?'\n\n':'')+ta.value.slice(e);}
    ta.dispatchEvent(new Event('input',{bubbles:true}));
    var a=document.querySelector('.tab[data-tab="articles"]'); if(a)a.click(); setTimeout(function(){ta.focus();},80);
  }

  function numberValue(id, fallback) {
    var n = parseFloat($(id) && $(id).value);
    return Number.isFinite(n) ? n : fallback;
  }

  function updateSelectionBox() {
    var sel = $('ocrCropSelection'); if (!sel) return;
    var x=numberValue('cropX',0), y=numberValue('cropY',0), w=numberValue('cropW',100), h=numberValue('cropH',100);
    sel.style.left=x+'%'; sel.style.top=y+'%'; sel.style.width=w+'%'; sel.style.height=h+'%';
  }

  function setCropValues(x,y,w,h) {
    x=Math.max(0,Math.min(99,x)); y=Math.max(0,Math.min(99,y));
    w=Math.max(1,Math.min(100-x,w)); h=Math.max(1,Math.min(100-y,h));
    [['cropX',x],['cropY',y],['cropW',w],['cropH',h]].forEach(function(pair){ if($(pair[0])) $(pair[0]).value=pair[1].toFixed(1).replace(/\.0$/,''); });
    updateSelectionBox();
    clearSketchResult();
  }

  function resetCrop() { setCropValues(0,0,100,100); }

  function bindCropSelector() {
    var stage=$('ocrCropStage'); if(!stage || stage.dataset.cropBound) return;
    stage.dataset.cropBound='1';
    function point(ev) {
      var r=stage.getBoundingClientRect();
      return {x:Math.max(0,Math.min(100,(ev.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(ev.clientY-r.top)/r.height*100))};
    }
    stage.addEventListener('pointerdown',function(ev){
      if(stage.hidden)return; ev.preventDefault(); stage.setPointerCapture(ev.pointerId);
      var p=point(ev); state.cropDrag={id:ev.pointerId,start:p}; setCropValues(p.x,p.y,1,1);
    });
    stage.addEventListener('pointermove',function(ev){
      if(!state.cropDrag||state.cropDrag.id!==ev.pointerId)return;
      var p=point(ev), a=state.cropDrag.start, x=Math.min(a.x,p.x), y=Math.min(a.y,p.y), w=Math.abs(p.x-a.x), h=Math.abs(p.y-a.y);
      setCropValues(x,y,Math.max(1,w),Math.max(1,h));
    });
    function finish(ev){ if(state.cropDrag&&state.cropDrag.id===ev.pointerId) state.cropDrag=null; }
    stage.addEventListener('pointerup',finish); stage.addEventListener('pointercancel',finish);
  }

  function clearSketchResult() {
    state.sketchSvg=''; state.sketchTikz=''; state.cropDataUrl=''; state.cropVectorizable=false;
    if($('ocrSvgResult'))$('ocrSvgResult').value=''; if($('ocrTikzResult'))$('ocrTikzResult').value='';
    if($('ocrSaveCrop'))$('ocrSaveCrop').disabled=true; if($('ocrSaveSvg'))$('ocrSaveSvg').disabled=true; if($('ocrCopyTikz'))$('ocrCopyTikz').disabled=true;
    if($('ocrSketchPreview'))$('ocrSketchPreview').textContent='尚未分析选区';
    if($('ocrSketchHint')){$('ocrSketchHint').className='ocr-vector-state';$('ocrSketchHint').textContent='先框选实际草图，再点击“分析所选草图”。';}
  }

  async function runSketch() {
    if(!state.file||!/^image\//.test(state.file.type||'')){progress(0,'草图处理需要图片文件',true);return;}
    if(!(await checkService()))return;
    try {
      progress(10,'正在裁切并分析所选草图…');
      var form=new FormData(); form.append('file',state.file,state.file.name);
      [['x','cropX'],['y','cropY'],['w','cropW'],['h','cropH']].forEach(function(pair){form.append(pair[0],numberValue(pair[1],pair[0]==='w'||pair[0]==='h'?100:0));});
      var res=await fetchWithTimeout(endpoint()+'/sketch',{method:'POST',body:form},120000,'草图分析');
      var d=await res.json().catch(function(){return{};}); if(!res.ok)throw new Error(d.detail||('HTTP '+res.status));
      state.sketchSvg=d.svg||''; state.sketchTikz=d.tikz||''; state.cropDataUrl=d.crop_png_data_url||''; state.cropVectorizable=!!d.vectorizable;
      $('ocrSvgResult').value=state.sketchSvg; $('ocrTikzResult').value=state.sketchTikz;
      $('ocrSketchPreview').innerHTML=state.cropDataUrl?'<img src="'+state.cropDataUrl+'" alt="真实裁切草图">':'<span>未返回裁切图</span>';
      $('ocrSaveCrop').disabled=!state.cropDataUrl; $('ocrSaveSvg').disabled=!state.sketchSvg; $('ocrCopyTikz').disabled=!state.sketchTikz;
      var det=d.detected||{}, meta=d.analysis||{};
      var hint=$('ocrSketchHint');
      hint.className='ocr-vector-state'+(state.cropVectorizable?' ok':'');
      hint.textContent=(d.warning||'')+' 线段 '+(det.lines||0)+' · 圆 '+(det.circles||0)+(meta.components!=null?' · 连通区域 '+meta.components:'')+(meta.edge_density!=null?' · 边缘密度 '+Number(meta.edge_density).toFixed(3):'');
      progress(100,state.cropVectorizable?'草图分析完成，可选 SVG/TikZ':'裁切完成；选区过复杂，建议直接使用裁切图');
    } catch(e){progress(100,'草图处理失败：'+(e.message||e),true);}
  }

  function articleDir(){var slug=($('fSlug')&&$('fSlug').value||'').trim().replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-+|-+$/g,'');return slug||'_shared';}
  function siteImagePath(rel){var b=String(H.base||'/');if(!b.endsWith('/'))b+='/';return b+String(rel).replace(/^\/+/, '');}
  function insertMarkdownImage(rel,alt){var ta=$('fBody');if(!ta)return;var text='\n!['+(alt||'草图')+']('+siteImagePath(rel)+')\n';var s=ta.selectionStart==null?ta.value.length:ta.selectionStart;ta.value=ta.value.slice(0,s)+text+ta.value.slice(s);ta.dispatchEvent(new Event('input',{bubbles:true}));}

  async function saveSvg() {
    if(!state.sketchSvg){progress(0,'当前选区未生成可靠 SVG',true);return;}
    var name='sketch-'+Date.now()+'.svg',rel='images/'+articleDir()+'/'+name,path=H.imagesDir+'/'+articleDir()+'/'+name;
    try{progress(30,'正在保存 SVG…');await window.GH.save(path,state.sketchSvg,null,'新增草图 SVG：'+name);insertMarkdownImage(rel,'草图');progress(100,'SVG 已保存并插入正文');}catch(e){progress(100,'SVG 保存失败：'+e.message,true);}
  }

  async function saveCrop() {
    if(!state.cropDataUrl){progress(0,'请先分析草图选区',true);return;}
    var m=/^data:image\/png;base64,(.+)$/.exec(state.cropDataUrl);if(!m){progress(0,'裁切图数据无效',true);return;}
    var name='sketch-crop-'+Date.now()+'.png',rel='images/'+articleDir()+'/'+name,path=H.imagesDir+'/'+articleDir()+'/'+name;
    try{progress(30,'正在保存裁切 PNG…');await window.GH.saveBinary(path,m[1],null,'新增草图裁切图：'+name);insertMarkdownImage(rel,'草图');progress(100,'裁切图已保存并插入正文');}catch(e){progress(100,'裁切图保存失败：'+e.message,true);}
  }

  function clearAll(){
    if(state.busy){progress(0,'OCR 正在本机运行，完成前请不要清空或刷新页面。',true);return;}
    state.file=null;state.currentJobId='';
    if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}
    if($('ocrFileInput'))$('ocrFileInput').value='';
    if($('ocrImagePreview')){$('ocrImagePreview').hidden=true;$('ocrImagePreview').removeAttribute('src');}
    if($('ocrCropStage'))$('ocrCropStage').hidden=true;if($('ocrCropEmpty')){$('ocrCropEmpty').hidden=false;$('ocrCropEmpty').textContent='请先上传一张图片';}
    if($('ocrDropHint')){$('ocrDropHint').hidden=false;$('ocrDropHint').innerHTML='<strong>拖入文件，或点击选择</strong><br><small>建议拍正、光线均匀、公式清晰</small>';}
    if($('ocrFileMeta'))$('ocrFileMeta').textContent='尚未选择文件';
    if($('ocrResult'))$('ocrResult').value='';if($('ocrPreview'))$('ocrPreview').innerHTML='';
    resetCrop();clearSketchResult();progress(0,'等待上传');
  }

  document.addEventListener('DOMContentLoaded',function(){
    addStyle();inject();setTimeout(checkService,800);
    document.addEventListener('click',function(ev){
      var tab=ev.target&&ev.target.closest?ev.target.closest('.tab[data-tab]'):null;
      if(tab){if(tab.dataset.tab==='ocr'){ev.preventDefault();setTimeout(function(){setOcrMode(true);checkService();},0);}else setTimeout(function(){setOcrMode(false);},0);}
      if(ev.target&&ev.target.closest&&ev.target.closest('#ocrDrop'))$('ocrFileInput').click();
      if(ev.target.id==='ocrCheckService')checkService();
      if(ev.target.id==='ocrRecognize')runOcr();
      if(ev.target.id==='ocrClear')clearAll();
      if(ev.target.id==='ocrInsert')insertIntoArticle(false);
      if(ev.target.id==='ocrReplace')insertIntoArticle(true);
      if(ev.target.id==='ocrBackToArticle'){var a=document.querySelector('.tab[data-tab="articles"]');if(a)a.click();}
      if(ev.target.id==='ocrCropReset')resetCrop();
      if(ev.target.id==='ocrSketchRun')runSketch();
      if(ev.target.id==='ocrSaveSvg')saveSvg();
      if(ev.target.id==='ocrSaveCrop')saveCrop();
      if(ev.target.id==='ocrCopy')navigator.clipboard&&navigator.clipboard.writeText($('ocrResult').value||'');
      if(ev.target.id==='ocrCopyTikz')navigator.clipboard&&navigator.clipboard.writeText($('ocrTikzResult').value||'');
    },true);
    document.addEventListener('change',function(ev){
      if(ev.target&&ev.target.id==='ocrFileInput')setFile(ev.target.files&&ev.target.files[0]);
      if(ev.target&&ev.target.id==='ocrEndpoint'){try{localStorage.setItem(ENDPOINT_KEY,endpoint());}catch(_){}}
      if(ev.target&&/^crop[XYWH]$/.test(ev.target.id)){updateSelectionBox();clearSketchResult();}
    },true);
    var drop=$('ocrDrop');
    if(drop){
      ['dragenter','dragover'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add('drag');});});
      ['dragleave','drop'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove('drag');});});
      drop.addEventListener('drop',function(e){var file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(file)setFile(file);});
    }
  });
})();