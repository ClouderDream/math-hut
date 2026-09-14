/** v1.6 后台体验增强：标题化列表、独立快捷键页、全局进度条。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]; }); }

  /* ---------- 进度条 ---------- */
  var timer = null;
  function ensureProgress() {
    if ($('hutProgress')) return $('hutProgress');
    var box = document.createElement('div');
    box.id = 'hutProgress';
    box.className = 'hut-progress';
    box.innerHTML = '<div class="hut-progress-track"><div class="hut-progress-fill" id="hutProgressFill"></div></div><span id="hutProgressText">准备就绪</span>';
    document.body.appendChild(box);
    return box;
  }
  function setProgress(percent, text, state) {
    ensureProgress(); clearInterval(timer);
    var box=$('hutProgress'), fill=$('hutProgressFill'), label=$('hutProgressText');
    percent=Math.max(0,Math.min(100,Number(percent)||0));
    box.classList.add('show'); box.classList.toggle('error',state==='error'); box.classList.toggle('done',state==='done');
    fill.style.width=percent+'%'; label.textContent=text||(percent+'%');
    if(percent>=100)setTimeout(function(){box.classList.remove('show','done','error');fill.style.width='0%';},1400);
  }
  function startProgress(text) {
    var p=10; setProgress(p,text||'处理中…');
    timer=setInterval(function(){p=Math.min(84,p+Math.max(1,Math.round((84-p)*.12)));setProgress(p,text||'处理中…');},500);
  }
  function finishProgress(text,error){setProgress(100,text||(error?'操作失败':'完成'),error?'error':'done');}
  window.HUTProgress={set:setProgress,start:startProgress,done:function(t){finishProgress(t,false);},error:function(t){finishProgress(t,true);}};
  function watchStatus(id){var el=$(id);if(!el)return;new MutationObserver(function(){var t=(el.textContent||'').trim();if(!t)return;if(/上传|提交中|保存中|读取中/.test(t)&&!/已|✅|失败/.test(t))startProgress(t.replace(/^.*?：/,''));if(/✅|已提交|已上传|已保存/.test(t))finishProgress(t,false);if(/失败|错误|无效|不足/.test(t))finishProgress(t,true);}).observe(el,{childList:true,characterData:true,subtree:true});}

  /* ---------- 文章/页面列表显示标题 ---------- */
  var metaCache={};
  function parseMeta(text){var fm=/^---\n([\s\S]*?)\n---/.exec(text||''),raw=fm?fm[1]:'';function get(k){var m=new RegExp('^'+k+':\\s*(.*)$','m').exec(raw);return m?String(m[1]).trim().replace(/^["']|["']$/g,''):'';}return{title:get('title'),date:get('date'),draft:/^draft:\s*true/im.test(raw)};}
  function modeDir(){var active=document.querySelector('.tab.active');return active&&active.dataset.tab==='pages'?H.pagesDir:H.postsDir;}
  async function enhanceAnchor(a){
    if(!a||a.dataset.titleEnhanced==='1')return;
    var raw=(a.textContent||'').trim(); if(!/\.md$/i.test(raw))return;
    a.dataset.titleEnhanced='loading'; var path=modeDir()+'/'+raw;
    try{var meta=metaCache[path];if(!meta){var r=await window.GH.read(path);meta=parseMeta(r.text);metaCache[path]=meta;}var fallback=raw.replace(/^_draft-/,'').replace(/^\d{4}-\d{2}-\d{2}-/,'').replace(/\.md$/i,'').replace(/-/g,' ');var title=meta.title||fallback;var state=meta.draft?'草稿':(modeDir()===H.pagesDir?'页面':'已发布');a.innerHTML='<span class="admin-item-title">'+esc(title)+'</span><small class="admin-item-meta">'+esc([meta.date,state].filter(Boolean).join(' · '))+'</small>';a.title=raw;a.dataset.titleEnhanced='1';}
    catch(e){a.textContent=raw.replace(/\.md$/i,'');a.dataset.titleEnhanced='1';}
  }
  function enhanceList(){var list=$('postList');if(list)list.querySelectorAll('a').forEach(enhanceAnchor);}

  /* ---------- 快捷键 ---------- */
  var KEY='hut_editor_shortcuts_v1';
  var defaults={bold:'Ctrl+B',italic:'Ctrl+I',link:'Ctrl+K',image:'Ctrl+Shift+I',save:'Ctrl+S',draft:'Ctrl+Shift+S',h2:'Ctrl+Alt+2',h3:'Ctrl+Alt+3'};
  function loadKeys(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return Object.assign({},defaults);}}
  function saveKeys(keys){try{localStorage.setItem(KEY,JSON.stringify(keys));}catch(e){}}
  var shortcuts=loadKeys();
  var labels={bold:'加粗',italic:'斜体',link:'插入链接',image:'插入图片',save:'保存并发布',draft:'保存草稿',h2:'二级标题',h3:'三级标题'};

  function injectShortcutTab(){
    var tabs=document.querySelector('.admin-header .tabs');
    if(tabs&&!tabs.querySelector('[data-tab="shortcuts"]')){var b=document.createElement('button');b.className='tab';b.dataset.tab='shortcuts';b.textContent='快捷键';var settings=tabs.querySelector('[data-tab="settings"]');tabs.insertBefore(b,settings||null);}
    if(!$('tab-shortcuts')){var main=$('mainArea');if(!main)return;var panel=document.createElement('div');panel.id='tab-shortcuts';panel.hidden=true;panel.innerHTML='<div class="shortcut-page"><div class="shortcut-head"><div><h3>编辑快捷键</h3><p>快捷键只保存在当前浏览器，修改后立即生效。</p></div><div class="shortcut-actions"><button type="button" class="btn ghost" id="shortcutReset">恢复默认</button><button type="button" class="btn primary" id="shortcutSave">保存快捷键</button></div></div><div class="shortcut-grid" id="shortcutGrid"></div><p class="status" id="shortcutStatus"></p></div>';main.appendChild(panel);}
    renderShortcutRows();
  }
  function renderShortcutRows(){var grid=$('shortcutGrid');if(!grid)return;grid.innerHTML=Object.keys(labels).map(function(k){return '<label class="shortcut-row"><span><strong>'+esc(labels[k])+'</strong><small>'+esc(k)+'</small></span><input type="text" data-shortcut="'+k+'" value="'+esc(shortcuts[k]||'')+'" placeholder="Ctrl+B"></label>';}).join('');}

  function setShortcutView(active){
    var panel=$('tab-shortcuts'); if(panel)panel.hidden=!active;
    if(active){
      ['tab-articles','tab-media','tab-settings'].forEach(function(id){var el=$(id);if(el)el.hidden=true;});
      document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab==='shortcuts');});
      if($('headerTitle'))$('headerTitle').textContent='快捷键设置';
      if($('newBtn'))$('newBtn').hidden=true;
      if($('listSearch'))$('listSearch').hidden=true;
      if($('postList'))$('postList').hidden=true;
      if($('sideMeta'))$('sideMeta').hidden=true;
      if($('sideTitle'))$('sideTitle').textContent='快捷键';
    }
    var app=$('appView'); if(app)app.classList.toggle('admin-wide',active||(!active&&document.querySelector('.tab.active')&&['media','settings'].includes(document.querySelector('.tab.active').dataset.tab)));
  }

  function normalizeCombo(s){return String(s||'').replace(/\s+/g,'').toLowerCase().replace('command','meta').replace('cmd','meta');}
  function matchCombo(ev,combo){combo=normalizeCombo(combo);if(!combo)return false;var parts=combo.split('+'),key=parts[parts.length-1],wantsCtrl=parts.indexOf('ctrl')>=0,wantsMeta=parts.indexOf('meta')>=0,wantsShift=parts.indexOf('shift')>=0,wantsAlt=parts.indexOf('alt')>=0;var ctrlOk=wantsCtrl?(ev.ctrlKey||ev.metaKey):(!ev.ctrlKey&&!ev.metaKey||wantsMeta);var metaOk=wantsMeta?ev.metaKey:true;return ctrlOk&&metaOk&&ev.shiftKey===wantsShift&&ev.altKey===wantsAlt&&String(ev.key||'').toLowerCase()===key;}
  function wrapText(before,after){var ta=$('fBody');if(!ta)return;var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value,sel=v.slice(s,e);ta.value=v.slice(0,s)+before+sel+after+v.slice(e);ta.focus();ta.setSelectionRange(s+before.length,s+before.length+sel.length);ta.dispatchEvent(new Event('input',{bubbles:true}));}
  function prefixLine(prefix){var ta=$('fBody');if(!ta)return;var p=ta.selectionStart,v=ta.value,start=v.lastIndexOf('\n',p-1)+1;ta.value=v.slice(0,start)+prefix+v.slice(start);ta.focus();ta.setSelectionRange(p+prefix.length,p+prefix.length);ta.dispatchEvent(new Event('input',{bubbles:true}));}
  function handleShortcut(ev){var target=ev.target;if(target&&target.matches&&target.matches('[data-shortcut]'))return;var action=null;Object.keys(shortcuts).some(function(k){if(matchCombo(ev,shortcuts[k])){action=k;return true;}return false;});if(!action)return;var editorVisible=$('tab-articles')&&!$('tab-articles').hidden;if(['bold','italic','link','image','h2','h3'].includes(action)&&!editorVisible)return;ev.preventDefault();if(action==='bold')wrapText('**','**');if(action==='italic')wrapText('*','*');if(action==='link')wrapText('[','](https://)');if(action==='image'&&$('inlineImageBtn'))$('inlineImageBtn').click();if(action==='h2')prefixLine('## ');if(action==='h3')prefixLine('### ');if(action==='save'&&$('saveBtn'))$('saveBtn').click();if(action==='draft'&&$('saveDraftBtn'))$('saveDraftBtn').click();}

  document.addEventListener('DOMContentLoaded',function(){
    ensureProgress();watchStatus('status');watchStatus('uploadStatus');watchStatus('settingsStatus');injectShortcutTab();enhanceList();
    var list=$('postList');if(list)new MutationObserver(function(){setTimeout(enhanceList,0);}).observe(list,{childList:true,subtree:true});
    document.addEventListener('click',function(ev){
      var tab=ev.target.closest&&ev.target.closest('.tab[data-tab]');
      if(tab){
        if(tab.dataset.tab==='shortcuts'){ev.preventDefault();setShortcutView(true);}
        else{setShortcutView(false);setTimeout(function(){var app=$('appView');if(app)app.classList.toggle('admin-wide',['media','settings'].includes(tab.dataset.tab));},0);}
      }
      if(ev.target.id==='shortcutSave'){var next={};document.querySelectorAll('[data-shortcut]').forEach(function(i){next[i.dataset.shortcut]=i.value.trim();});shortcuts=Object.assign({},defaults,next);saveKeys(shortcuts);$('shortcutStatus').textContent='✅ 已保存并立即生效';renderShortcutRows();}
      if(ev.target.id==='shortcutReset'){shortcuts=Object.assign({},defaults);saveKeys(shortcuts);renderShortcutRows();$('shortcutStatus').textContent='已恢复默认快捷键';}
      if(ev.target.id==='saveBtn')startProgress('正在保存并提交文章…');
      if(ev.target.id==='saveDraftBtn')startProgress('正在保存草稿…');
    });
    document.addEventListener('change',function(ev){if(ev.target&&['uploadInput','inlineImageInput'].includes(ev.target.id))startProgress('正在上传图片…');},true);
    window.addEventListener('keydown',handleShortcut,true);
  });
})();
