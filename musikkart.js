"use strict";
/* MODUS Musikkart: independent personal self-assessment, never accredited mastery. */
(() => {
const catalog=[{"id":"F01","title":"Lyd og tonehøyde","level":1},{"id":"F02","title":"Puls, takt og rytme","level":1},{"id":"F03","title":"Tonenavn og intervaller","level":1},{"id":"F04","title":"Durskalaen","level":1},{"id":"E01","title":"Tonearter og kvintsirkelen","level":2},{"id":"E02","title":"Moll og treklanger","level":2},{"id":"E03","title":"Diatoniske progresjoner","level":2},{"id":"E04","title":"Pentatonikk og gehør","level":2},{"id":"I01","title":"Funksjonsharmonikk","level":3},{"id":"I02","title":"Kadenser og ii–V–I","level":3},{"id":"I03","title":"Moduser","level":3},{"id":"I04","title":"Motivisk improvisasjon","level":3},{"id":"A01","title":"Sekundærdominanter","level":4},{"id":"A02","title":"Modal harmonikk","level":4},{"id":"A03","title":"Stemmeføring og reharmonisering","level":4},{"id":"A04","title":"Oddetakt og form","level":4},{"id":"P01","title":"Kromatisk harmonikk","level":5},{"id":"P02","title":"Jazzharmonikk","level":5},{"id":"P03","title":"Kontrapunkt","level":5},{"id":"P04","title":"Orkestrering og produksjon","level":5},{"id":"X01","title":"Strukturell analyse","level":6},{"id":"X02","title":"Eget harmonisk språk","level":6},{"id":"X03","title":"Original komposisjon","level":6},{"id":"X04","title":"Kunstnerisk portefølje","level":6}];
const groups=[
 {id:"grunnlag",name:"Musikkens grunnlag",color:"#d2d987",ids:["F01","F03","F04"]},
 {id:"rytme",name:"Rytme og puls",color:"#cca778",ids:["F02","A04"]},
 {id:"skala",name:"Skalaer og modalitet",color:"#84c0a7",ids:["E04","I03","A02"]},
 {id:"harmoni",name:"Harmonikk og analyse",color:"#9fb9df",ids:["E01","E02","E03","I01","I02","A01","P01","P02"]},
 {id:"gehor",name:"Gehør og lytting",color:"#d3a5c2",ids:[]},
 {id:"gitar",name:"Gitar og teknikk",color:"#91aaa4",ids:[]},
 {id:"impro",name:"Improvisasjon",color:"#ddaf8d",ids:["I04"]},
 {id:"komposisjon",name:"Komposisjon og form",color:"#aa9ed7",ids:["P03","X02","X03"]},
 {id:"produksjon",name:"Arrangering og produksjon",color:"#b0c584",ids:["P04"]},
 {id:"praksis",name:"Musikalsk praksis",color:"#7fbdc4",ids:["A03","X01","X04"]}
];
const byId=new Map(catalog.map(m=>[m.id,m]));
const $=id=>document.getElementById(id);const ns="http://www.w3.org/2000/svg";
const STORE="modus-musikkart-v1";const valid=new Set(["not-started","exploring","learned"]);
let stored={};try{stored=JSON.parse(localStorage.getItem(STORE)||"{}")||{}}catch{}
const records={};for(const m of catalog){const r=stored[m.id]||{};records[m.id]={state:valid.has(r.state)?r.state:"not-started",idea:r.idea===true,note:typeof r.note==="string"?r.note.slice(0,2000):""};}
const categoryRecords={};for(const g of groups){categoryRecords[g.id]=valid.has(stored._categories?.[g.id])?stored._categories[g.id]:"not-started";}
let chosen=null,category=null,search="";
const svg=$("music-map");
function svgEl(tag,attr={},content){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attr))e.setAttribute(k,String(v));if(content!==undefined)e.textContent=content;return e;}
function save(){try{localStorage.setItem(STORE,JSON.stringify({...records,_categories:categoryRecords}));$("map-save-status").textContent="Lagret i denne nettleseren.";}catch{$("map-save-status").textContent="Nettleseren tillot ikke lagring. Bruk eksport for å ta vare på kartleggingen.";}}
function groupModules(g){return g.ids.map(id=>byId.get(id)).filter(Boolean);}
function groupState(g){const a=groupModules(g);if(!a.length)return categoryRecords[g.id];const num=a.filter(m=>records[m.id].state==="learned").length;const active=a.some(m=>records[m.id].state!=="not-started");return num===a.length?"learned":active?"exploring":"not-started";}
function variant(state){return state==="learned"?"on":state==="exploring"?"mid":"off";}
function activityState(id){return records[id]?.state||"not-started";}
function curve(x1,y1,x2,y2,color,state,width){return svgEl("path",{d:"M "+x1+" "+y1+" C "+(x1+135)+" "+y1+", "+(x2-140)+" "+y2+", "+x2+" "+y2,stroke:color,"stroke-width":width,class:"map-branch "+variant(state),style:"color:"+color});}
function node(x,y,w,h,label,color,state,type,id){
 const group=svgEl("g",{class:"map-node "+variant(state)+" "+type+(chosen===id||category===id?" selected":""),role:"button",tabindex:"0","aria-label":label+". "+(state==="learned"?"Egenvurdert lært":state==="exploring"?"Under arbeid":"Ikke gjennomgått")});
 const rect=svgEl("rect",{x,y:y-h/2,width:w,height:h,rx:11,fill:type==="root-node"?"#d7f48c":"#1b231b",stroke:color,style:"color:"+color});
 const txt=svgEl("text",{x:x+18,y:y+5},label);
 group.append(rect,txt);
 group.addEventListener("click",()=>choose(type==="branch-node"?"category":"module",id));
 group.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose(type==="branch-node"?"category":"module",id);}});
 return group;
}
function render(){
 svg.replaceChildren();
 const layer=svgEl("g",{});
 const selectedGroup=groups.find(g=>g.id===category);
 const opened=!!selectedGroup;
 const height=opened?Math.max(680,selectedGroup.ids.length*85+180):1210;
 svg.setAttribute("viewBox","0 0 1380 "+height);
 const center=height/2;
 const root=svgEl("g",{class:"map-node root-node",role:"img","aria-label":"MODUS – musikalsk landskap"});
 root.append(svgEl("rect",{x:30,y:center-45,width:315,height:90,rx:16,fill:"#d7f48c",stroke:"#d7f48c"}));
 root.append(svgEl("text",{x:53,y:center+7},"MODUS · MUSIKKART"));layer.append(root);
 if(!opened){
   // Overview: only broad subject areas. No crowded microtext or overlapping modules.
   const step=107,first=(height-step*(groups.length-1))/2;
   groups.forEach((g,i)=>{
     const y=first+i*step,state=groupState(g);
     layer.append(curve(345,center,550,y,g.color,state,5));
     const cat=node(550,y,725,70,g.name,g.color,state,"branch-node",g.id);
     cat.append(svgEl("text",{x:1187,y:y+6,fill:"#b9c6b2","font-size":16,"font-family":"Manrope,Arial,sans-serif","text-anchor":"end"},g.ids.length?g.ids.length+" emner  ›":"Utforsk  ›"));
     if(search && (g.name+" "+groupModules(g).map(m=>m.title).join(" ")).toLowerCase().includes(search))cat.classList.add("match");
     layer.append(cat);
   });
 }else{
   const g=selectedGroup,state=groupState(g),items=groupModules(g);
   const y=center;
   layer.append(curve(345,center,455,y,g.color,state,6));
   const branch=node(455,y,395,72,g.name,g.color,state,"branch-node",g.id);
   layer.append(branch);
   if(items.length){
     const spacing=85,first=(height-spacing*(items.length-1))/2;
     items.forEach((m,i)=>{
       const cy=first+i*spacing;
       layer.append(curve(850,y,933,cy,g.color,activityState(m.id),3));
       const item=node(933,cy,414,62,m.id+" · "+m.title,g.color,activityState(m.id),"module-node",m.id);
       if(search&&(m.id+" "+m.title).toLowerCase().includes(search))item.classList.add("match");
       layer.append(item);
     });
   }else{
     layer.append(svgEl("text",{x:920,y:center+5,fill:"#c4d0be","font-size":20,"font-family":"Manrope,Arial,sans-serif"},"Dette fagområdet kartlegges videre."));
   }
 }
 svg.append(layer);
 $("map-count").textContent=opened?selectedGroup.name+" · "+selectedGroup.ids.length+" emner":groups.length+" fagområder · "+catalog.length+" moduler";
 $("map-learned").textContent=catalog.filter(m=>records[m.id].state==="learned").length;
 $("map-exploring").textContent=catalog.filter(m=>records[m.id].state==="exploring").length;
 $("map-planned").textContent=catalog.filter(m=>records[m.id].idea).length;
 for(const button of $("inspector-module").querySelectorAll("[data-state]")){
   const state=chosen?records[chosen].state:category?groupState(selectedGroup):"not-started";
   button.setAttribute("aria-pressed",String(button.dataset.state===state));
 }
}

function choose(type,id){
 const g=type==="category"?groups.find(x=>x.id===id):null;
 const m=type==="module"?byId.get(id):null;
 if(!m&&!g)return;
 chosen=m?.id||null;category=g?.id||(m?groups.find(group=>group.ids.includes(m.id))?.id:null)||null;
 $("inspector-module").hidden=false;
 $("inspector-heading").textContent=m?m.title:g.name;
 $("inspector-description").textContent=m?"Velg hvordan du selv vurderer din kjennskap til dette emnet. Du kan også registrere det som en mulig kursidé.":"Dette fagområdet samler "+g.ids.length+" planlagte moduler. Endrer du status her, får alle modulene i grenen samme egenvurderte status.";
 $("inspector-meta").textContent=m?"MODUL "+m.id+" · NIVÅ "+m.level:"FAGOMRÅDE · "+g.ids.length+" MODULER";
 $("map-personal-note").disabled=!m;
 $("map-personal-note").value=m?records[m.id].note:"";
 $("course-idea").disabled=!m;
 $("course-idea").checked=m?records[m.id].idea:false;
 $("module-open").href=m?"undervisning.html?modul="+encodeURIComponent(m.id):"laereplan.html";
 $("module-open").textContent=m?"Åpne modulvisning ↗":"Se hele læreplanen ↗";
 $("map-save-status").textContent="";
 render();
}
$("inspector-module").querySelectorAll("[data-state]").forEach(b=>b.addEventListener("click",()=>{
 const state=b.dataset.state;if(!valid.has(state))return;
 if(chosen)records[chosen].state=state;
 else if(category){const g=groups.find(g=>g.id===category);if(g.ids.length){for(const id of g.ids)records[id].state=state;}else categoryRecords[g.id]=state;}
 save();render();
}));
$("map-personal-note").addEventListener("input",e=>{if(chosen){records[chosen].note=e.target.value.slice(0,2000);save();}});
$("course-idea").addEventListener("change",e=>{if(chosen){records[chosen].idea=e.target.checked;save();render();}});
$("map-search").addEventListener("input",e=>{
 search=e.target.value.trim().toLowerCase();
 const match=search.length>1?groups.find(g=>(g.name+" "+groupModules(g).map(m=>m.id+" "+m.title).join(" ")).toLowerCase().includes(search)):null;
 if(match){category=match.id;chosen=null;$("inspector-module").hidden=true;}
 else if(!search){category=null;chosen=null;$("inspector-module").hidden=true;}
 render();
});
$("map-reset").addEventListener("click",()=>{
 $("map-search").value="";search="";category=null;chosen=null;
 $("inspector-module").hidden=true;
 $("inspector-heading").textContent="Velg et område";
 $("inspector-description").textContent="Velg en hovedgren. Da åpner de tilhørende modulene seg med større, lesbar tekst.";
 render();
});
$("map-export").addEventListener("click",()=>{
 const payload={type:"modus-music-map-self-assessment",version:1,exportedAt:new Date().toISOString(),meaning:"Private self-assessment; not accredited or verified learning",records,categories:categoryRecords};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download="modus-musikkart.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("map-clear").addEventListener("click",()=>{
 if(!window.confirm("Nullstille alle dine lokale læringsmarkeringer og notater?"))return;
 for(const m of catalog)records[m.id]={state:"not-started",idea:false,note:""};
 for(const g of groups)categoryRecords[g.id]="not-started";
 try{localStorage.removeItem(STORE)}catch{}
 chosen=null;category=null;$("inspector-module").hidden=true;$("inspector-heading").textContent="Velg et område";$("inspector-description").textContent="Kartet er nullstilt.";render();
});
render();
})();
