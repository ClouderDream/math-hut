/** v1.4 站点设置：把 Hero / 导航 / 社交 / 页脚统一改成文字框编辑。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function val(id) { var el=$(id); return el ? el.value.trim() : ''; }
  function setv(id,v) { var el=$(id); if(el) el.value=v==null?'':String(v); }
  function stat(msg,err) { var el=$('settingsStatus'); if(!el)return; el.textContent=msg||''; el.className='status'+(err?' error':msg?' success':''); }
  function field(label,id,ph,area) {
    return '<label class="field"><span>'+esc(label)+'</span>'+(area?'<textarea id="'+id+'" rows="2" placeholder="'+esc(ph||'')+'"></textarea>':'<input type="text" id="'+id+'" placeholder="'+esc(ph||'')+'">')+'</label>';
  }
  function addStyle() {
    if($('v14SettingsStyle')) return;
    var s=document.createElement('style'); s.id='v14SettingsStyle';
    s.textContent='.v14-note{margin:0 0 18px;padding:12px 14px;border:1px solid var(--admin-border);background:var(--admin-bg);color:var(--admin-muted);font-size:12.5px;line-height:1.7;border-radius:var(--radius)}.v14-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px}.v14-grid .field{margin:0}.v14-wide{grid-column:1/-1}.v14-rows{display:grid;gap:10px}.v14-nav-row{display:grid;grid-template-columns:minmax(100px,.8fr) minmax(220px,1.7fr);gap:10px}.v14-social-row{display:grid;grid-template-columns:minmax(100px,.8fr) minmax(160px,1.2fr) minmax(220px,1.7fr);gap:10px}@media(max-width:760px){.v14-grid,.v14-nav-row,.v14-social-row{grid-template-columns:1fr}.v14-wide{grid-column:auto}}';
    document.head.appendChild(s);
  }
  function inject() {
    var form=$('settingsForm'); if(!form || form.dataset.v14Settings) return;
    form.dataset.v14Settings='1'; addStyle();
    ['sNav','sSocial'].forEach(function(id){var el=$(id); if(el&&el.closest('.field')) el.closest('.field').style.display='none';});
    var banner=$('sBanner'); if(banner&&banner.closest('.field')) { var sp=banner.closest('.field').querySelector('span'); if(sp) sp.textContent='全站共享图片路径（可选）'; }
    var anchor=$('settingsStatus');
    var wrap=document.createElement('div'); wrap.id='v14Settings';
    wrap.innerHTML='<p class="v14-note">这里统一管理前台固定内容。导航、社交、首页首屏和页脚都使用普通文字框，不需要再编辑 JSON。</p>'+
      '<fieldset class="meta-group"><legend>品牌与首页首屏</legend><div class="v14-grid">'+
      field('品牌标记','sBrandMark','云')+field('Hero 小标题','sHeroKicker','数理 · 直觉 · 证明')+
      '<div class="v14-wide">'+field('Hero 主标题','sHeroTitle','在公式与直觉之间，搭建一座小屋。',true)+'</div>'+
      '<div class="v14-wide">'+field('Hero 简介','sHeroLede','首页首屏的一段简介',true)+'</div>'+
      field('主按钮文字','sHeroPrimaryText','开始阅读')+field('主按钮链接','sHeroPrimaryLink','/archive/')+
      field('次按钮文字','sHeroSecondaryText','订阅更新')+field('次按钮链接','sHeroSecondaryLink','/rss.xml')+
      '</div></fieldset>'+
      '<fieldset class="meta-group"><legend>导航菜单</legend><div class="v14-rows" id="v14NavRows"></div></fieldset>'+
      '<fieldset class="meta-group"><legend>社交与联系</legend><div class="v14-rows" id="v14SocialRows"></div></fieldset>'+
      '<fieldset class="meta-group"><legend>页脚</legend><div class="v14-grid">'+field('版权后文案','sFooterTagline','用公式记录好奇心')+field('右侧说明','sFooterPowered','由 GitHub Pages 驱动 · 极简编辑风')+'</div></fieldset>';
    form.insertBefore(wrap,anchor);
    var nr=$('v14NavRows');
    for(var i=0;i<6;i++){var row=document.createElement('div');row.className='v14-nav-row';row.innerHTML=field('名称 '+(i+1),'sNavText'+i,i===0?'首页':'')+field('链接 '+(i+1),'sNavLink'+i,i===0?'/':'');nr.appendChild(row);}
    var sr=$('v14SocialRows');
    for(var j=0;j<4;j++){var r=document.createElement('div');r.className='v14-social-row';r.innerHTML=field('名称 '+(j+1),'sSocialName'+j,j===0?'GitHub':'')+field('显示文字','sSocialText'+j,'显示给访客看的内容')+field('链接','sSocialLink'+j,'https://… 或 mailto:…');sr.appendChild(r);}
  }
  async function load() {
    inject();
    try {
      var r=await window.GH.read(H.siteConfigPath), data=JSON.parse(r.text||'{}'), site=data.site||{};
      setv('sTitle',site.title);setv('sSubtitle',site.subtitle);setv('sDesc',site.description);setv('sAuthor',site.author);setv('sCopyright',site.copyright);setv('sBanner',site.banner);
      setv('sBrandMark',site.brandMark||'云');setv('sHeroKicker',site.heroKicker||site.subtitle||'');setv('sHeroTitle',site.heroTitle||'');setv('sHeroLede',site.heroLede||'');
      setv('sHeroPrimaryText',site.heroPrimaryText||'开始阅读');setv('sHeroPrimaryLink',site.heroPrimaryLink||'/archive/');setv('sHeroSecondaryText',site.heroSecondaryText||'订阅更新');setv('sHeroSecondaryLink',site.heroSecondaryLink||'/rss.xml');
      setv('sFooterTagline',site.footerTagline||'用公式记录好奇心');setv('sFooterPowered',site.footerPowered||'由 GitHub Pages 驱动 · 极简编辑风');
      var nav=Array.isArray(data.nav)?data.nav:[];for(var i=0;i<6;i++){setv('sNavText'+i,nav[i]&&nav[i].text);setv('sNavLink'+i,nav[i]&&nav[i].link);}
      var social=Array.isArray(data.social)?data.social:[];for(var j=0;j<4;j++){setv('sSocialName'+j,social[j]&&social[j].name);setv('sSocialText'+j,social[j]&&social[j].text);setv('sSocialLink'+j,social[j]&&social[j].link);}
    } catch(e) { stat('读取设置失败：'+e.message,true); }
  }
  async function save() {
    stat('保存中…');
    try {
      var cur=await window.GH.read(H.siteConfigPath), data={}; try{data=JSON.parse(cur.text||'{}');}catch(e){}
      data.site=Object.assign({},data.site||{},{title:val('sTitle'),subtitle:val('sSubtitle'),description:val('sDesc'),author:val('sAuthor'),copyright:val('sCopyright'),banner:val('sBanner'),brandMark:val('sBrandMark')||'云',heroKicker:val('sHeroKicker'),heroTitle:val('sHeroTitle'),heroLede:val('sHeroLede'),heroPrimaryText:val('sHeroPrimaryText'),heroPrimaryLink:val('sHeroPrimaryLink'),heroSecondaryText:val('sHeroSecondaryText'),heroSecondaryLink:val('sHeroSecondaryLink'),footerTagline:val('sFooterTagline'),footerPowered:val('sFooterPowered')});
      data.nav=[]; for(var i=0;i<6;i++){var t=val('sNavText'+i),l=val('sNavLink'+i);if(t&&l)data.nav.push({text:t,link:l});}
      data.social=[]; for(var j=0;j<4;j++){var n=val('sSocialName'+j),tx=val('sSocialText'+j),lk=val('sSocialLink'+j);if(n&&lk)data.social.push({name:n,icon:n.toLowerCase()==='github'?'github':n.indexOf('邮')>=0?'mail':'link',link:lk,text:tx||lk});}
      await window.GH.save(H.siteConfigPath,JSON.stringify(data,null,2)+'\n',cur.sha,'更新站点设置');
      stat('✅ 站点设置已保存，约 1~3 分钟后线上生效',false);
    } catch(e) { stat('保存失败：'+e.message,true); }
  }
  document.addEventListener('DOMContentLoaded',function(){
    inject();
    document.addEventListener('submit',function(ev){if(ev.target&&ev.target.id==='settingsForm'){ev.preventDefault();ev.stopImmediatePropagation();save();}},true);
    document.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('[data-tab="settings"]');if(t)setTimeout(load,80);});
  });
})();
