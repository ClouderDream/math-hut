/** v1.7 站点设置：仅维护全站固定配置；“关于”独立在顶部关于页编辑。 */
(function () {
  var H = window.__HUT__ || {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function val(id) { var el=$(id); return el ? el.value.trim() : ''; }
  function setv(id,v) { var el=$(id); if(el) el.value=v==null?'':String(v); }
  function stat(msg,err) { var el=$('settingsStatus'); if(!el)return; el.textContent=msg||''; el.className='status'+(err?' error':msg?' success':''); }
  function progress(p,t,state){ if(window.HUTProgress){ if(state==='error')window.HUTProgress.error(t); else if(state==='done')window.HUTProgress.done(t); else window.HUTProgress.set(p,t); } }
  function field(label,id,ph,area,rows) {
    return '<label class="field"><span>'+esc(label)+'</span>'+(area?'<textarea id="'+id+'" rows="'+(rows||3)+'" placeholder="'+esc(ph||'')+'"></textarea>':'<input type="text" id="'+id+'" placeholder="'+esc(ph||'')+'">')+'</label>';
  }
  function getLabel(id){var el=$(id);return el&&el.closest('.field');}

  function addStyle() {
    if($('v17SettingsStyle')) return;
    var s=document.createElement('style'); s.id='v17SettingsStyle';
    s.textContent=`
      .settings-form{max-width:none;margin:0;width:100%}
      .settings-form>.admin-toolbar{position:sticky;top:0;z-index:8;margin:-30px -36px 24px;padding:16px 36px;background:rgba(251,249,244,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--admin-border)}
      .v17-settings-shell{display:grid;grid-template-columns:170px minmax(0,1fr);gap:24px;align-items:start;width:100%}
      .v17-settings-nav{position:sticky;top:82px;padding:10px;background:var(--admin-panel);border:1px solid var(--admin-border);border-radius:10px;box-shadow:var(--shadow)}
      .v17-settings-nav button{display:block;width:100%;padding:9px 10px;border:0;background:transparent;text-align:left;color:var(--admin-muted);font:inherit;font-size:12.5px;border-radius:6px;cursor:pointer;white-space:nowrap}
      .v17-settings-nav button:hover{background:var(--admin-bg);color:var(--admin-ink)}
      .v17-settings-content{display:grid;gap:18px;min-width:0}
      .settings-card{scroll-margin-top:92px;background:var(--admin-panel);border:1px solid var(--admin-border);border-radius:10px;padding:22px;box-shadow:0 1px 2px rgba(28,27,25,.03);min-width:0}
      .settings-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--admin-border)}
      .settings-card-head h4{margin:0;font-family:var(--admin-display);font-size:17px}.settings-card-head p{margin:4px 0 0;color:var(--admin-faint);font-size:11.5px}
      .v17-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}.v17-grid .field{margin:0}.v17-wide{grid-column:1/-1}
      .v17-rows{display:grid;gap:10px}.v17-nav-row,.v17-social-row{display:grid;gap:10px;padding:12px;background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:7px;min-width:0}
      .v17-nav-row{grid-template-columns:minmax(120px,.8fr) minmax(180px,1.7fr)}.v17-social-row{grid-template-columns:minmax(110px,.7fr) minmax(160px,1.1fr) minmax(200px,1.5fr)}
      .v17-tip{margin:0 0 18px;padding:12px 14px;border:1px solid var(--admin-border);background:var(--admin-bg);color:var(--admin-muted);font-size:12.5px;line-height:1.7;border-radius:7px}
      @media(max-width:1100px){.v17-settings-shell{grid-template-columns:1fr}.v17-settings-nav{position:static;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch}.v17-settings-nav button{width:auto;flex:0 0 auto}.v17-grid{grid-template-columns:1fr}.v17-wide{grid-column:auto}.v17-social-row{grid-template-columns:1fr 1fr}.v17-social-row .field:last-child{grid-column:1/-1}}
      @media(max-width:720px){.settings-form>.admin-toolbar{margin:-14px -12px 18px;padding:12px}.settings-card{padding:16px}.v17-nav-row,.v17-social-row{grid-template-columns:1fr}.v17-social-row .field:last-child{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  function card(id,title,desc){var s=document.createElement('section');s.className='settings-card';s.id=id;s.innerHTML='<div class="settings-card-head"><div><h4>'+esc(title)+'</h4><p>'+esc(desc||'')+'</p></div></div>';return s;}

  function inject() {
    var form=$('settingsForm'); if(!form || form.dataset.v17Settings)return;
    form.dataset.v17Settings='1'; addStyle();

    /* 隐藏旧模板中的 JSON 输入；关于页不再由站点设置维护。 */
    ['sNav','sSocial'].forEach(function(id){var el=$(id),lab=el&&el.closest('.field');if(lab)lab.style.display='none';});
    var oldAbout=$('settings-about'); if(oldAbout) oldAbout.remove();
    ['sAboutTitle','sAboutSummary','sAboutBody'].forEach(function(id){var el=$(id),lab=el&&el.closest('.field');if(lab)lab.remove();});

    var oldShell=form.querySelector('.v15-settings-shell'); if(oldShell) oldShell.remove();
    var oldTip=form.querySelector('.v15-tip'); if(oldTip) oldTip.remove();

    var shell=document.createElement('div');shell.className='v17-settings-shell';shell.innerHTML='<aside class="v17-settings-nav"><button type="button" data-v17-jump="settings-basic-v17">基础信息</button><button type="button" data-v17-jump="settings-hero-v17">首页首屏</button><button type="button" data-v17-jump="settings-nav-v17">导航菜单</button><button type="button" data-v17-jump="settings-social-v17">社交联系</button><button type="button" data-v17-jump="settings-footer-v17">页脚</button></aside><div class="v17-settings-content" id="v17SettingsContent"></div>';
    var anchor=$('settingsStatus');form.insertBefore(shell,anchor);
    var content=$('v17SettingsContent');

    var basic=card('settings-basic-v17','基础信息','站点名称、SEO、作者及全站共享图片。');var bg=document.createElement('div');bg.className='v17-grid';basic.appendChild(bg);
    ['sTitle','sSubtitle','sDesc','sAuthor','sCopyright','sBanner'].forEach(function(id){var lab=getLabel(id);if(lab){lab.style.display='';if(id==='sDesc'||id==='sBanner')lab.classList.add('v17-wide');bg.appendChild(lab);}});content.appendChild(basic);

    var hero=card('settings-hero-v17','品牌与首页首屏','首页固定内容从这里修改。');hero.insertAdjacentHTML('beforeend','<div class="v17-grid">'+field('品牌标记','sBrandMark','云')+field('Hero 小标题','sHeroKicker','数理 · 直觉 · 证明')+'<div class="v17-wide">'+field('Hero 主标题','sHeroTitle','在公式与直觉之间，搭建一座小屋。',true,3)+'</div><div class="v17-wide">'+field('Hero 简介','sHeroLede','首页首屏的一段简介',true,4)+'</div>'+field('主按钮文字','sHeroPrimaryText','开始阅读')+field('主按钮链接','sHeroPrimaryLink','/archive/')+field('次按钮文字','sHeroSecondaryText','订阅更新')+field('次按钮链接','sHeroSecondaryLink','/rss.xml')+'</div>');content.appendChild(hero);

    var nav=card('settings-nav-v17','导航菜单','一行一个入口；空行不会保存。');nav.insertAdjacentHTML('beforeend','<div class="v17-rows" id="v17NavRows"></div>');content.appendChild(nav);var nr=$('v17NavRows');for(var i=0;i<6;i++){var row=document.createElement('div');row.className='v17-nav-row';row.innerHTML=field('名称 '+(i+1),'sNavText'+i,i===0?'首页':'')+field('链接 '+(i+1),'sNavLink'+i,i===0?'/':'');nr.appendChild(row);}

    var social=card('settings-social-v17','社交与联系','统一维护 GitHub、邮箱等展示内容。');social.insertAdjacentHTML('beforeend','<div class="v17-rows" id="v17SocialRows"></div>');content.appendChild(social);var sr=$('v17SocialRows');for(var j=0;j<4;j++){var r=document.createElement('div');r.className='v17-social-row';r.innerHTML=field('名称 '+(j+1),'sSocialName'+j,j===0?'GitHub':'')+field('显示文字','sSocialText'+j,'访客看到的文字')+field('链接','sSocialLink'+j,'https://… 或 mailto:…');sr.appendChild(r);}

    var footer=card('settings-footer-v17','页脚','页脚固定文案。');footer.insertAdjacentHTML('beforeend','<div class="v17-grid">'+field('版权后文案','sFooterTagline','用公式记录好奇心')+field('右侧说明','sFooterPowered','由 GitHub Pages 驱动 · 极简编辑风')+'</div>');content.appendChild(footer);

    var tip=document.createElement('p');tip.className='v17-tip';tip.textContent='站点设置只维护全站固定配置；“关于本站”请使用顶部“关于”页单独编辑。';form.insertBefore(tip,anchor);
  }

  async function load() {
    inject(); progress(15,'正在读取站点设置…');
    try {
      var r=await window.GH.read(H.siteConfigPath),data=JSON.parse(r.text||'{}'),site=data.site||{};
      setv('sTitle',site.title);setv('sSubtitle',site.subtitle);setv('sDesc',site.description);setv('sAuthor',site.author);setv('sCopyright',site.copyright);setv('sBanner',site.banner);
      setv('sBrandMark',site.brandMark||'云');setv('sHeroKicker',site.heroKicker||site.subtitle||'');setv('sHeroTitle',site.heroTitle||'');setv('sHeroLede',site.heroLede||'');setv('sHeroPrimaryText',site.heroPrimaryText||'开始阅读');setv('sHeroPrimaryLink',site.heroPrimaryLink||'/archive/');setv('sHeroSecondaryText',site.heroSecondaryText||'订阅更新');setv('sHeroSecondaryLink',site.heroSecondaryLink||'/rss.xml');setv('sFooterTagline',site.footerTagline||'用公式记录好奇心');setv('sFooterPowered',site.footerPowered||'由 GitHub Pages 驱动 · 极简编辑风');
      var nav=Array.isArray(data.nav)?data.nav:[];for(var i=0;i<6;i++){setv('sNavText'+i,nav[i]&&nav[i].text);setv('sNavLink'+i,nav[i]&&nav[i].link);}
      var social=Array.isArray(data.social)?data.social:[];for(var j=0;j<4;j++){setv('sSocialName'+j,social[j]&&social[j].name);setv('sSocialText'+j,social[j]&&social[j].text);setv('sSocialLink'+j,social[j]&&social[j].link);}
      $('settingsForm').dataset.siteSha=r.sha||'';
      progress(100,'站点设置已载入','done');
    } catch(e) { stat('读取设置失败：'+e.message,true);progress(100,'读取设置失败','error'); }
  }

  async function save() {
    stat('保存中…');progress(12,'正在整理站点设置…');
    try {
      var cur=await window.GH.read(H.siteConfigPath),data={};try{data=JSON.parse(cur.text||'{}');}catch(e){}
      data.site=Object.assign({},data.site||{},{title:val('sTitle'),subtitle:val('sSubtitle'),description:val('sDesc'),author:val('sAuthor'),copyright:val('sCopyright'),banner:val('sBanner'),brandMark:val('sBrandMark')||'云',heroKicker:val('sHeroKicker'),heroTitle:val('sHeroTitle'),heroLede:val('sHeroLede'),heroPrimaryText:val('sHeroPrimaryText'),heroPrimaryLink:val('sHeroPrimaryLink'),heroSecondaryText:val('sHeroSecondaryText'),heroSecondaryLink:val('sHeroSecondaryLink'),footerTagline:val('sFooterTagline'),footerPowered:val('sFooterPowered')});
      data.nav=[];for(var i=0;i<6;i++){var t=val('sNavText'+i),l=val('sNavLink'+i);if(t&&l)data.nav.push({text:t,link:l});}
      data.social=[];for(var j=0;j<4;j++){var n=val('sSocialName'+j),tx=val('sSocialText'+j),lk=val('sSocialLink'+j);if(n&&lk)data.social.push({name:n,icon:n.toLowerCase()==='github'?'github':n.indexOf('邮')>=0?'mail':'link',link:lk,text:tx||lk});}
      progress(55,'正在保存站点配置…');
      await window.GH.save(H.siteConfigPath,JSON.stringify(data,null,2)+'\n',cur.sha,'更新站点设置');
      progress(100,'站点设置已保存','done');stat('✅ 已保存到 GitHub，约 1~3 分钟后线上生效',false);
    } catch(e) { stat('保存失败：'+e.message,true);progress(100,'保存失败：'+e.message,'error'); }
  }

  document.addEventListener('DOMContentLoaded',function(){
    inject();
    document.addEventListener('submit',function(ev){if(ev.target&&ev.target.id==='settingsForm'){ev.preventDefault();ev.stopImmediatePropagation();save();}},true);
    document.addEventListener('click',function(ev){
      var t=ev.target.closest&&ev.target.closest('[data-tab="settings"],[data-v17-jump]');if(!t)return;
      if(t.dataset&&t.dataset.tab==='settings')setTimeout(load,80);
      if(t.dataset&&t.dataset.v17Jump){var el=$(t.dataset.v17Jump);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });
})();
