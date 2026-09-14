/* v1.4 editor workflow enhancements */
(function(){
  function $(id){return document.getElementById(id);}
  function status(msg,bad){var el=$('status');if(!el)return;el.textContent=msg;el.className='status'+(bad?' error':' success');}
  function insertText(text){var ta=$('fBody');if(!ta)return;ta.focus();var s=ta.selectionStart||0,e=ta.selectionEnd||0,v=ta.value;ta.value=v.slice(0,s)+text+v.slice(e);var p=s+text.length;ta.setSelectionRange(p,p);ta.dispatchEvent(new Event('input',{bubbles:true}));}
  function extFor(file){var name=file.name||'';var m=/\.([a-zA-Z0-9]+)$/.exec(name);if(m)return m[1].toLowerCase();var type=file.type||'';if(type==='image/png')return'png';if(type==='image/jpeg')return'jpg';if(type==='image/webp')return'webp';if(type==='image/gif')return'gif';if(type==='image/svg+xml')return'svg';return'bin';}
  function safeBase(name){return String(name||'image').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'image';}
  function b64(buffer){var bytes=new Uint8Array(buffer),bin='';for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin);}
  async function uploadAndInsert(file){
    if(!file||!/^image\//i.test(file.type||'')){status('只能插入图片文件',true);return;}
    if(file.size>5*1024*1024){status('图片超过 5MB，请压缩后再上传',true);return;}
    var H=window.__HUT__||{};
    var stamp=new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    var filename=stamp+'-'+safeBase(file.name)+'.'+extFor(file);
    var path=H.imagesDir+'/'+filename;
    status('正在上传并插入 '+filename+' …',false);
    try{
      var buf=await file.arrayBuffer();
      await window.GH.saveBinary(path,b64(buf),null,'新增正文图片：'+filename);
      var alt=(file.name||'图片').replace(/\.[^.]+$/,'');
      insertText('!['+alt+'](images/'+filename+')');
      status('已上传并插入：images/'+filename,false);
    }catch(err){status('图片上传失败：'+(err.message||err),true);}
  }
  function addWritingButtons(){
    var bar=$('symbolBar');if(!bar||bar.dataset.v14)return;bar.dataset.v14='1';
    var sep=document.createElement('span');sep.className='symbol-sep';
    var items=[['H2','## 标题\n'],['H3','### 小标题\n'],['引用','> 引用内容\n'],['列表','- 列表项\n'],['表格','| 项目 | 内容 |\n| --- | --- |\n| 示例 | 示例 |\n']];
    items.reverse().forEach(function(it){var b=document.createElement('button');b.type='button';b.className='sym sym-action';b.textContent=it[0];b.title='插入'+it[0];b.addEventListener('click',function(){insertText(it[1]);});bar.insertBefore(b,bar.firstChild);});
    bar.insertBefore(sep,bar.firstChild);
  }
  function addCounter(){
    var ta=$('fBody');if(!ta||$('editorCounter'))return;
    var el=document.createElement('span');el.id='editorCounter';el.className='editor-counter';
    var head=ta.closest('.editor-pane');head=head&&head.querySelector('.pane-head');if(head)head.appendChild(el);
    function refresh(){var t=ta.value||'';var chars=t.replace(/\s/g,'').length;var lines=t?t.split(/\n/).length:0;el.textContent=chars+' 字符 · '+lines+' 行';}
    ta.addEventListener('input',refresh);refresh();
  }
  function bindPaste(){
    var ta=$('fBody');if(!ta||ta.dataset.pasteImage)return;ta.dataset.pasteImage='1';
    ta.addEventListener('paste',function(ev){var items=ev.clipboardData&&ev.clipboardData.items;if(!items)return;for(var i=0;i<items.length;i++){if(items[i].kind==='file'&&/^image\//i.test(items[i].type||'')){ev.preventDefault();uploadAndInsert(items[i].getAsFile());return;}}});
  }
  function bindShortcuts(){
    document.addEventListener('keydown',function(ev){if(!(ev.ctrlKey||ev.metaKey))return;var key=String(ev.key||'').toLowerCase();if(key==='s'){ev.preventDefault();var btn=ev.shiftKey?$('saveDraftBtn'):$('saveBtn');if(btn)btn.click();}});
  }
  function enhanceMedia(){
    var grid=$('mediaGrid');if(!grid)return;
    var obs=new MutationObserver(function(){Array.prototype.forEach.call(grid.querySelectorAll('.media-item'),function(card){if(card.querySelector('.insert-body-btn'))return;var name=card.querySelector('.media-name');if(!name)return;var btn=document.createElement('button');btn.type='button';btn.className='insert-body-btn';btn.textContent='插入正文';btn.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();insertText('!['+name.textContent.replace(/\.[^.]+$/,'')+'](images/'+name.textContent+')');var tab=document.querySelector('.tab[data-tab="articles"]');if(tab)tab.click();status('已从媒体库插入：images/'+name.textContent,false);});card.appendChild(btn);});});
    obs.observe(grid,{childList:true,subtree:true});
  }
  function injectStyles(){var s=document.createElement('style');s.textContent='.editor-counter{margin-left:auto;color:var(--admin-faint);font-size:11px}.insert-body-btn{width:calc(100% - 16px);margin:0 8px 8px;padding:6px 8px;border:1px solid var(--admin-border-strong);background:var(--admin-bg);border-radius:20px;color:var(--admin-primary);cursor:pointer;font:inherit}.insert-body-btn:hover{border-color:var(--admin-primary)}';document.head.appendChild(s);}
  document.addEventListener('DOMContentLoaded',function(){injectStyles();addWritingButtons();addCounter();bindPaste();bindShortcuts();enhanceMedia();});
})();
