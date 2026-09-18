/** 免费本地 OCR 工作区：PaddleOCR localhost + 草图裁切/SVG/TikZ。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  var ENDPOINT_KEY = 'hut_local_ocr_endpoint';
  var state = { file: null, objectUrl: '', busy: false, currentJobId: '', sketchSvg: '', sketchTikz: '', cropDataUrl: '' };

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
      .ocr-page{max-width:1640px;margin:0 auto;display:grid;gap:16px}
      .ocr-hero,.ocr-card{border:1px solid var(--admin-border);background:var(--admin-surface);border-radius:12px;padding:18px;min-width:0}
      .ocr-hero{display:flex;align-items:center;justify-content:space-between;gap:16px}
      .ocr-hero h3,.ocr-card h4{margin:0 0 6px}.ocr-hero p,.ocr-card p{margin:0;color:var(--admin-muted)}
      .ocr-service{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:10px;align-items:end;margin-top:14px}
      .ocr-service .field{margin:0}.ocr-badge{display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border:1px solid var(--admin-border);border-radius:999px;color:var(--admin-muted);white-space:nowrap}.ocr-badge.ok{color:#176b3a;border-color:#95c4a8;background:rgba(64,150,92,.08)}.ocr-badge.bad{color:#9d3b31;border-color:#d5aaa5;background:rgba(170,65,50,.06)}
      .ocr-work{display:grid;grid-template-columns:minmax(300px,.78fr) minmax(440px,1.22fr);gap:16px;align-items:start}
      .ocr-drop{position:relative;min-height:260px;border:1.5px dashed var(--admin-border);border-radius:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:22px;cursor:pointer;background:var(--admin-bg);overflow:hidden}
      .ocr-drop.drag{border-color:var(--admin-accent);background:rgba(52,64,107,.06)}.ocr-drop img{max-width:100%;max-height:560px;object-fit:contain;border-radius:6px}
      .ocr-file-meta{margin-top:12px;font-size:12px;color:var(--admin-muted);word-break:break-all}.ocr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.ocr-actions .btn{min-width:110px}
      .ocr-progress{height:7px;background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:999px;overflow:hidden;margin-top:12px}.ocr-progress>i{display:block;height:100%;width:0;background:var(--admin-accent);transition:width .25s ease}.ocr-status{min-height:22px;margin-top:8px;font-size:12px;color:var(--admin-muted)}
      .ocr-result-card{display:flex;flex-direction:column}.ocr-result-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.ocr-result-tabs{display:flex;gap:6px}.ocr-mini-tab{border:1px solid var(--admin-border);background:transparent;border-radius:999px;padding:6px 10px;cursor:pointer}.ocr-mini-tab.active{background:#181816;color:#fff;border-color:#181816}
      .ocr-result-area textarea{width:100%;min-height:480px;resize:vertical;border:1px solid var(--admin-border);border-radius:8px;padding:14px;background:var(--admin-bg);color:inherit;font:13px/1.75 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.ocr-preview{min-height:480px;max-height:720px;overflow:auto;border:1px solid var(--admin-border);border-radius:8px;padding:20px;background:#fff}.ocr-preview img{max-width:100%}
      .ocr-sketch-grid{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(380px,1.2fr);gap:16px}.ocr-crop-grid{display:grid;grid-template-columns:repeat(4,minmax(70px,1fr));gap:8px;margin-top:14px}.ocr-crop-grid .field{margin:0}.ocr-sketch-output{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ocr-sketch-output textarea{width:100%;min-height:220px;resize:vertical;border:1px solid var(--admin-border);border-radius:8px;padding:12px;background:var(--admin-bg);font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.ocr-sketch-preview{display:flex;align-items:center;justify-content:center;min-height:220px;border:1px solid var(--admin-border);border-radius:8px;background:#fff;padding:12px;overflow:auto}.ocr-sketch-preview svg,.ocr-sketch-preview img{max-width:100%;max-height:360px}.ocr-warning{margin-top:12px;padding:10px 12px;border-left:3px solid #b7863f;background:rgba(183,134,63,.08);font-size:12px;line-height:1.7;color:var(--admin-muted)}
      @media(max-width:1000px){.ocr-service{grid-template-columns:1fr}.ocr-work,.ocr-sketch-grid{grid-template-columns:1fr}.ocr-result-area textarea,.ocr-preview{min-height:340px}}
      @media(max-width:620px){.ocr-hero{align-items:flex-start;flex-direction:column}.ocr-card,.ocr-hero{padding:14px}.ocr-crop-grid,.ocr-sketch-output{grid-template-columns:1fr 1fr}.ocr-actions .btn{flex:1 1 42%}}
    `;
    document.head.appendChild(s);
  }

  function panelHtml() {
    return '<div class="ocr-page">' +
      '<section class="ocr-hero"><div><h3>本地 OCR · 手写数学笔记</h3><p>完全免费、本机处理：图片/PDF → 中文/公式/版面 → Markdown；草图可裁切并转 SVG/TikZ。</p></div><button class="btn ghost" type="button" id="ocrBackToArticle">返回文章编辑</button></section>' +
      '<section class="ocr-card"><h4>本地识别服务</h4><p>先在电脑运行 <code>tools/local-ocr/server.py</code>。浏览器只访问本机，不需要 Mathpix 或任何付费 API Key。</p><div class="ocr-service"><label class="field"><span>服务地址</span><input id="ocrEndpoint" value="http://127.0.0.1:8765" spellcheck="false"></label><button class="btn ghost" type="button" id="ocrCheckService">检查连接</button><span class="ocr-badge" id="ocrServiceBadge">未检查</span></div></section>' +
      '<div class="ocr-work"><section class="ocr-card"><h4>1. 上传原稿</h4><p>支持 JPG / PNG / WebP / TIFF / PDF。识别结果只作为初稿，不自动发布。</p><div class="ocr-drop" id="ocrDrop"><div id="ocrDropHint"><strong>拖入文件，或点击选择</strong><br><small>建议拍正、光线均匀、公式清晰</small></div><img id="ocrImagePreview" alt="原稿预览" hidden></div><input id="ocrFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff,application/pdf" hidden><div class="ocr-file-meta" id="ocrFileMeta">尚未选择文件</div><div class="ocr-actions"><button class="btn primary" type="button" id="ocrRecognize">识别并初排版</button><button class="btn ghost" type="button" id="ocrClear">清空</button></div><div class="ocr-progress"><i id="ocrProgressFill"></i></div><div class="ocr-status" id="ocrStatus">等待上传</div></section>' +
      '<section class="ocr-card ocr-result-card"><div class="ocr-result-head"><div><h4>2. 校对与排版</h4><span class="ocr-file-meta">重点核对不等号、导数符号、上下标、分式和参数区间。</span></div><div class="ocr-result-tabs"><button class="ocr-mini-tab active" type="button" data-ocr-view="edit">Markdown</button><button class="ocr-mini-tab" type="button" data-ocr-view="preview">预览</button></div></div><div class="ocr-result-area"><textarea id="ocrResult" spellcheck="false" placeholder="本地 OCR 结果会出现在这里。"></textarea><div class="ocr-preview post-body" id="ocrPreview" hidden></div></div><div class="ocr-actions"><button class="btn primary" type="button" id="ocrInsert">插入当前文章</button><button class="btn ghost" type="button" id="ocrReplace">替换当前正文</button><button class="btn ghost" type="button" id="ocrCopy">复制 Markdown</button></div></section></div>' +
      '<section class="ocr-card"><h4>3. 草图处理</h4><p>对上传图片指定裁切范围（百分比）。简单几何图会检测线段/圆并给出 SVG + TikZ；复杂草图建议保留裁切 PNG 或 SVG，避免错误结构化。</p><div class="ocr-sketch-grid"><div><div class="ocr-crop-grid">' +
      '<label class="field"><span>X %</span><input id="cropX" type="number" min="0" max="99" value="0"></label><label class="field"><span>Y %</span><input id="cropY" type="number" min="0" max="99" value="0"></label><label class="field"><span>宽 %</span><input id="cropW" type="number" min="1" max="100" value="100"></label><label class="field"><span>高 %</span><input id="cropH" type="number" min="1" max="100" value="100"></label></div><div class="ocr-actions"><button class="btn primary" type="button" id="ocrSketchRun">生成 SVG / TikZ</button><button class="btn ghost" type="button" id="ocrSaveSvg">保存 SVG 并插入正文</button><button class="btn ghost" type="button" id="ocrSaveCrop">保存裁切 PNG 并插入正文</button><button class="btn ghost" type="button" id="ocrCopyTikz">复制 TikZ</button></div><div class="ocr-warning" id="ocrSketchHint">TikZ 当前只处理基础几何线段和圆。复杂函数曲线、箭头、手写标注优先使用 SVG/裁切图并人工整理。</div></div><div><div class="ocr-sketch-preview" id="ocrSketchPreview">尚未生成草图结果</div><div class="ocr-sketch-output"><textarea id="ocrSvgResult" placeholder="SVG" spellcheck="false"></textarea><textarea id="ocrTikzResult" placeholder="TikZ" spellcheck="false"></textarea></div></div></div></section>' +
    '</div>';
  }

  function inject() {
    var tabs = document.querySelector('.admin-header .tabs');
    if (tabs && !tabs.querySelector('[data-tab="ocr"]')) {
      var b = document.createElement('button'); b.className = 'tab'; b.dataset.tab = 'ocr'; b.textContent = 'OCR 导入'; b.title = '免费本地 OCR / 草图导入';
      var media = tabs.querySelector('[data-tab="media"]'); tabs.insertBefore(b, media || null);
    }
    if (!$('tab-ocr')) { var main = $('mainArea'); if (!main) return; var panel = document.createElement('div'); panel.id = 'tab-ocr'; panel.hidden = true; panel.innerHTML = panelHtml(); main.appendChild(panel); }
    try { var saved = localStorage.getItem(ENDPOINT_KEY); if (saved && $('ocrEndpoint')) $('ocrEndpoint').value = saved; } catch (e) {}
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
    if (ms && ms > 0) {
      t = setTimeout(function () { timedOut = true; ctl.abort(); }, ms);
    }
    options = Object.assign({}, options || {}, { signal: ctl.signal });
    try {
      return await fetch(url, options);
    } catch (e) {
      var message = String((e && e.message) || e || '');
      if (timedOut) {
        throw new Error((label || '请求') + '超时。OCR 任务可能仍在本机运行，请保持服务开启后重试状态检查。');
      }
      if ((e && e.name === 'AbortError') || /aborted|abort/i.test(message)) {
        throw new Error((label || '请求') + '被浏览器中断。请不要刷新页面，并确认本地 OCR 服务仍在运行。');
      }
      throw e;
    } finally {
      if (t) clearTimeout(t);
    }
  }

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function elapsedText(startedAt) {
    var sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    if (sec < 60) return sec + ' 秒';
    return Math.floor(sec / 60) + ' 分 ' + (sec % 60) + ' 秒';
  }

  async function checkService() {
    var badge = $('ocrServiceBadge');
    try {
      if (badge) { badge.textContent = '检查中…'; badge.className = 'ocr-badge'; }
      var res = await fetchWithTimeout(endpoint() + '/health', {}, 5000); var data = await res.json();
      if (!res.ok || !data.ok) throw new Error('HTTP ' + res.status);
      if (badge) { badge.textContent = '● 已连接 · ' + (data.engine || 'Local OCR'); badge.className = 'ocr-badge ok'; }
      try { localStorage.setItem(ENDPOINT_KEY, endpoint()); } catch (e) {}
      return true;
    } catch (e) {
      if (badge) { badge.textContent = '● 未连接'; badge.className = 'ocr-badge bad'; }
      progress(0, '本地 OCR 未启动：请运行 tools/local-ocr/server.py', true); return false;
    }
  }

  function setFile(file) {
    if (!file) return; var ok = /^image\//.test(file.type) || /\.pdf$/i.test(file.name || ''); if (!ok) { progress(0, '仅支持图片或 PDF。', true); return; }
    state.file = file; if (state.objectUrl) URL.revokeObjectURL(state.objectUrl); state.objectUrl = URL.createObjectURL(file);
    var img = $('ocrImagePreview'), hint = $('ocrDropHint');
    if (/^image\//.test(file.type)) { img.src = state.objectUrl; img.hidden = false; if (hint) hint.hidden = true; }
    else { img.hidden = true; img.removeAttribute('src'); if (hint) { hint.hidden = false; hint.innerHTML = '<strong>PDF 已选择</strong><br><small>将按全部页面解析</small>'; } }
    if ($('ocrFileMeta')) $('ocrFileMeta').textContent = file.name + ' · ' + (file.size / 1024 / 1024).toFixed(2) + ' MB'; progress(0, '文件已就绪');
  }

  function renderPreview() {
    var text = $('ocrResult') ? $('ocrResult').value : '', box = $('ocrPreview'); if (!box) return;
    try { var md = window.markdownit ? window.markdownit({html:false,linkify:true}) : null; if (md && window.mdMath) window.mdMath(md,{katex:window.katex,macros:H.macros||{}}); box.innerHTML = md ? md.render(text) : '<pre>'+esc(text)+'</pre>'; }
    catch(e){ box.innerHTML='<pre>'+esc(text)+'</pre>'; }
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
        if (data.status === 'queued') {
          progress(22, 'OCR 已排队，等待本机模型空闲 · 已等待 ' + elapsed);
        } else {
          var seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
          var pseudo = Math.min(90, 35 + Math.floor(seconds / 20));
          progress(pseudo, '本机 PP-StructureV3 正在识别 · 已用时 ' + elapsed + '。复杂手写整页可能需要数分钟。');
        }
      } catch (e) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 5) {
          throw new Error('连续 5 次无法读取 OCR 状态：' + (e.message || e));
        }
        progress(30, 'OCR 仍在本机运行；状态检查暂时失败，正在自动重试（' + consecutiveFailures + '/5）');
      }
    }
    throw new Error('OCR 任务已停止');
  }

  async function runOcr() {
    if (state.busy) return;
    if (!state.file) { progress(0, '请先选择图片或 PDF。', true); return; }
    if (!(await checkService())) return;

    state.busy = true;
    state.currentJobId = '';
    $('ocrRecognize').disabled = true;
    try {
      progress(8, '正在上传原稿并创建本机 OCR 任务…');
      var form = new FormData();
      form.append('file', state.file, state.file.name);

      var startRes = await fetchWithTimeout(endpoint() + '/ocr/start', { method: 'POST', body: form }, 60000, '创建 OCR 任务');
      var markdown = '';

      if (startRes.status === 404 || startRes.status === 405) {
        markdown = await runLegacyOcr(form);
      } else {
        var startData = await startRes.json().catch(function () { return {}; });
        if (!startRes.ok) throw new Error(startData.detail || ('HTTP ' + startRes.status));
        if (!startData.job_id) throw new Error('本地服务未返回 OCR 任务编号');
        state.currentJobId = startData.job_id;
        progress(18, 'OCR 任务已创建，等待本机处理…');
        markdown = await pollOcrJob(startData.job_id);
      }

      $('ocrResult').value = markdown || '';
      renderPreview();
      progress(100, 'OCR 完成，请对照原稿校对');
    } catch (e) {
      progress(100, 'OCR 失败：' + (e.message || e), true);
    } finally {
      state.busy = false;
      state.currentJobId = '';
      $('ocrRecognize').disabled = false;
    }
  }

  function insertIntoArticle(replace) {
    var ta=$('fBody'),src=$('ocrResult'); if(!ta||!src)return; var text=src.value.trim(); if(!text){progress(0,'没有可插入结果',true);return;}
    if(replace){if(ta.value.trim()&&!confirm('将用 OCR 结果替换当前正文，是否继续？'))return;ta.value=text;}else{var s=ta.selectionStart==null?ta.value.length:ta.selectionStart,e=ta.selectionEnd==null?s:ta.selectionEnd;ta.value=ta.value.slice(0,s)+(s?'\n\n':'')+text+(e<ta.value.length?'\n\n':'')+ta.value.slice(e);}
    ta.dispatchEvent(new Event('input',{bubbles:true})); var a=document.querySelector('.tab[data-tab="articles"]'); if(a)a.click(); setTimeout(function(){ta.focus();},80);
  }

  async function runSketch() {
    if(!state.file||!/^image\//.test(state.file.type||'')){progress(0,'草图处理需要图片文件',true);return;} if(!(await checkService()))return;
    try{progress(10,'正在分析草图…');var f=new FormData();f.append('file',state.file,state.file.name);['X','Y','W','H'].forEach(function(k){f.append(k.toLowerCase(),($('crop'+k).value||'0'));});var res=await fetchWithTimeout(endpoint()+'/sketch',{method:'POST',body:f},120000);var d=await res.json().catch(function(){return{};});if(!res.ok)throw new Error(d.detail||('HTTP '+res.status));state.sketchSvg=d.svg||'';state.sketchTikz=d.tikz||'';state.cropDataUrl=d.crop_png_data_url||'';$('ocrSvgResult').value=state.sketchSvg;$('ocrTikzResult').value=state.sketchTikz;$('ocrSketchPreview').innerHTML=state.sketchSvg||'<span>未检测到基础几何</span>';$('ocrSketchHint').textContent=(d.warning||'')+' 检测：'+((d.detected&&d.detected.lines)||0)+' 条线，'+((d.detected&&d.detected.circles)||0)+' 个圆。';progress(100,'草图处理完成');}catch(e){progress(100,'草图处理失败：'+e.message,true);}
  }

  function articleDir(){var slug=($('fSlug')&&$('fSlug').value||'').trim().replace(/[^a-zA-Z0-9-]+/g,'-').replace(/^-+|-+$/g,'');return slug||'_shared';}
  function siteImagePath(rel){var b=String(H.base||'/');if(!b.endsWith('/'))b+='/';return b+String(rel).replace(/^\/+/, '');}
  function insertMarkdownImage(rel,alt){var ta=$('fBody');if(!ta)return;var text='\n!['+(alt||'草图')+']('+siteImagePath(rel)+')\n';var s=ta.selectionStart||ta.value.length;ta.value=ta.value.slice(0,s)+text+ta.value.slice(s);ta.dispatchEvent(new Event('input',{bubbles:true}));}

  async function saveSvg() {
    if(!state.sketchSvg){progress(0,'请先生成草图 SVG',true);return;}var name='sketch-'+Date.now()+'.svg',rel='images/'+articleDir()+'/'+name,path=H.imagesDir+'/'+articleDir()+'/'+name;
    try{progress(30,'正在保存 SVG…');await window.GH.save(path,state.sketchSvg,null,'新增草图 SVG：'+name);insertMarkdownImage(rel,'草图');progress(100,'SVG 已保存并插入正文');}catch(e){progress(100,'SVG 保存失败：'+e.message,true);}
  }

  async function saveCrop() {
    if(!state.cropDataUrl){progress(0,'请先生成草图裁切结果',true);return;}var m=/^data:image\/png;base64,(.+)$/.exec(state.cropDataUrl);if(!m){progress(0,'裁切图数据无效',true);return;}var name='sketch-crop-'+Date.now()+'.png',rel='images/'+articleDir()+'/'+name,path=H.imagesDir+'/'+articleDir()+'/'+name;
    try{progress(30,'正在保存裁切 PNG…');await window.GH.saveBinary(path,m[1],null,'新增草图裁切图：'+name);insertMarkdownImage(rel,'草图');progress(100,'裁切图已保存并插入正文');}catch(e){progress(100,'裁切图保存失败：'+e.message,true);}
  }

  function clearAll(){if(state.busy){progress(0,'OCR 正在本机运行，完成前请不要清空或刷新页面。',true);return;}state.file=null;state.currentJobId='';state.sketchSvg='';state.sketchTikz='';state.cropDataUrl='';if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl='';}if($('ocrFileInput'))$('ocrFileInput').value='';if($('ocrImagePreview')){$('ocrImagePreview').hidden=true;$('ocrImagePreview').removeAttribute('src');}if($('ocrDropHint')){$('ocrDropHint').hidden=false;$('ocrDropHint').innerHTML='<strong>拖入文件，或点击选择</strong><br><small>建议拍正、光线均匀、公式清晰</small>';}if($('ocrFileMeta'))$('ocrFileMeta').textContent='尚未选择文件';if($('ocrResult'))$('ocrResult').value='';if($('ocrPreview'))$('ocrPreview').innerHTML='';if($('ocrSvgResult'))$('ocrSvgResult').value='';if($('ocrTikzResult'))$('ocrTikzResult').value='';if($('ocrSketchPreview'))$('ocrSketchPreview').textContent='尚未生成草图结果';progress(0,'等待上传');}

  document.addEventListener('DOMContentLoaded',function(){addStyle();inject();setTimeout(checkService,800);
    document.addEventListener('click',function(ev){var tab=ev.target&&ev.target.closest?ev.target.closest('.tab[data-tab]'):null;if(tab){if(tab.dataset.tab==='ocr'){ev.preventDefault();setTimeout(function(){setOcrMode(true);checkService();},0);}else setTimeout(function(){setOcrMode(false);},0);}if(ev.target&&ev.target.closest&&ev.target.closest('#ocrDrop'))$('ocrFileInput').click();if(ev.target.id==='ocrCheckService')checkService();if(ev.target.id==='ocrRecognize')runOcr();if(ev.target.id==='ocrClear')clearAll();if(ev.target.id==='ocrInsert')insertIntoArticle(false);if(ev.target.id==='ocrReplace')insertIntoArticle(true);if(ev.target.id==='ocrBackToArticle'){var a=document.querySelector('.tab[data-tab="articles"]');if(a)a.click();}if(ev.target.id==='ocrSketchRun')runSketch();if(ev.target.id==='ocrSaveSvg')saveSvg();if(ev.target.id==='ocrSaveCrop')saveCrop();if(ev.target.id==='ocrCopy')navigator.clipboard&&navigator.clipboard.writeText($('ocrResult').value||'');if(ev.target.id==='ocrCopyTikz')navigator.clipboard&&navigator.clipboard.writeText($('ocrTikzResult').value||'');var mini=ev.target.closest&&ev.target.closest('[data-ocr-view]');if(mini){document.querySelectorAll('[data-ocr-view]').forEach(function(b){b.classList.toggle('active',b===mini);});var pv=mini.dataset.ocrView==='preview';$('ocrResult').hidden=pv;$('ocrPreview').hidden=!pv;if(pv)renderPreview();}},true);
    document.addEventListener('change',function(ev){if(ev.target&&ev.target.id==='ocrFileInput')setFile(ev.target.files&&ev.target.files[0]);if(ev.target&&ev.target.id==='ocrEndpoint'){try{localStorage.setItem(ENDPOINT_KEY,endpoint());}catch(e){}}},true);
    var drop=$('ocrDrop');if(drop){['dragenter','dragover'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add('drag');});});['dragleave','drop'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove('drag');});});drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)setFile(f);});}
  });
})();
