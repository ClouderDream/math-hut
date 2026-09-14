/** v1.4：从媒体库返回文章/设置时不重置正在编辑的内容。 */
(function () {
  var wanted='', returnTab='';
  function $(id){return document.getElementById(id);}
  function show(name){
    document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===name);});
    var editor=$('tab-articles'),media=$('tab-media'),settings=$('tab-settings');
    if(editor)editor.hidden=name!=='articles'; if(media)media.hidden=name!=='media'; if(settings)settings.hidden=name!=='settings';
    var article=name==='articles';
    if($('newBtn'))$('newBtn').hidden=!article; if($('listSearch'))$('listSearch').hidden=!article; if($('postList'))$('postList').hidden=!article; if($('sideMeta'))$('sideMeta').hidden=!article;
    if($('headerTitle'))$('headerTitle').textContent=article?'文章管理':name==='settings'?'站点设置':'媒体库';
    if($('sideTitle'))$('sideTitle').textContent=article?'文章列表':'侧边栏';
  }
  document.addEventListener('click',function(ev){
    var t=ev.target.closest&&ev.target.closest('#pickCoverBtn,#pickBannerBtn,[data-tab]'); if(!t)return;
    var active=document.querySelector('.tab.active');
    if(t.id==='pickCoverBtn'){wanted='cover';returnTab='articles';}
    else if(t.id==='pickBannerBtn'){wanted='banner';returnTab='settings';}
    else if(t.dataset&&t.dataset.tab==='media'&&active){returnTab=active.dataset.tab||'';}
    else if(t.dataset&&returnTab&&t.dataset.tab===returnTab&&$('tab-media')&&!$('tab-media').hidden){ev.preventDefault();ev.stopImmediatePropagation();show(returnTab);returnTab='';}
  },true);
  document.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('[data-v14="pick"]'); if(!b||!wanted)return;
    ev.preventDefault(); ev.stopImmediatePropagation(); var rel=b.getAttribute('data-rel')||'';
    if(wanted==='cover'&&$('fCover')){$('fCover').value=rel;show('articles');}
    if(wanted==='banner'&&$('sBanner')){$('sBanner').value=rel;show('settings');}
    wanted=''; returnTab='';
  },true);
})();
