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
const records={};for(const m of catalog){const r=stored[m.id]||{};records[m.id]={state:valid.has(r.state)?r.state:"not-started",manual:r.manual===true||(r.manual===undefined&&valid.has(r.state)&&r.state!=="not-started"),idea:r.idea===true,note:typeof r.note==="string"?r.note.slice(0,2000):""};}
// The build projects approved mappings for this locale. Existing quiz criteria
// stay fixed when new reading links are added.
const articleModules={"toner-og-intervaller": "F03", "dur-og-moll": "E02", "kvintsirkelen": "E01", "din-forste-improvisasjon": "I04", "moduser-og-tonalt-sentrum": "I03", "kirketonearter-ett-system-sju-uttrykk": "I03", "romertall-i-musikk": "I01", "ii-v-i-kadensen": "I02", "treklanger-fra-grunnform-til-omvending": "E02", "septimakkorder": "E02", "harmonisk-moll-og-frygisk-dominant": "I03", "stemmeforing": "A03", "rytme-i-sju-aatte": "A04", "bygg-akkorder-i-en-toneart": "E03", "ett-skalakart-nye-maltoner": "E04", "dorisk-og-eolisk": "I03"};
const articleLinks=[{"slug": "toner-og-intervaller", "title": "Toner og intervaller: musikkens byggesteiner", "modules": ["F03"]}, {"slug": "dur-og-moll", "title": "Dur og moll: en tone gjør forskjellen", "modules": ["E02"]}, {"slug": "kvintsirkelen", "title": "Kvintsirkelen", "modules": ["E01"]}, {"slug": "din-forste-improvisasjon", "title": "Fra skala til første improvisasjon", "modules": ["I04"]}, {"slug": "moduser-og-tonalt-sentrum", "title": "Moduser: sentrum er viktigere enn starttonen", "modules": ["I03"]}, {"slug": "kirketonearter-ett-system-sju-uttrykk", "title": "Kirketonearter: ett tonesystem, sju musikalske uttrykk", "modules": ["I03"]}, {"slug": "romertall-i-musikk", "title": "Romertall i musikk: forstå akkordene bak tallene", "modules": ["I01"]}, {"slug": "ii-v-i-kadensen", "title": "ii–V–I: hvorfor akkorder vil hjem", "modules": ["I02"]}, {"slug": "treklanger-fra-grunnform-til-omvending", "title": "Treklanger: fra grunntone til akkordens tre toner", "modules": ["E02"]}, {"slug": "septimakkorder", "title": "Septimakkorder: mer farge, samme grunnmur", "modules": ["E02"]}, {"slug": "harmonisk-moll-og-frygisk-dominant", "title": "Harmonisk moll og frygisk dominant", "modules": ["I03"]}, {"slug": "stemmeforing", "title": "Stemmeføring: den korteste veien mellom akkorder", "modules": ["A03"]}, {"slug": "rytme-i-sju-aatte", "title": "Rytme i 7/8: grupper som føles naturlige", "modules": ["A04"]}, {"slug": "bygg-akkorder-i-en-toneart", "title": "Hvordan bygge akkordene i en toneart?", "modules": ["E03"]}, {"slug": "ett-skalakart-nye-maltoner", "title": "Ett skalakart, nye måltoner", "modules": ["E04"]}, {"slug": "dorisk-og-eolisk", "title": "Dorisk og eolisk: samme grunntone, ny farge", "modules": ["I03"]}, {"slug": "intervallomvendinger", "title": "Intervallomvendinger: hør samme toner fra en ny side", "modules": ["F03"]}, {"slug": "kadens-og-tonale-funksjoner", "title": "Kadens og tonale funksjoner: bygg en tydelig avslutning", "modules": ["I01", "I02"]}, {"slug": "sekundaerdominanter", "title": "Sekundærdominanter: gi en akkord sin egen opptakt", "modules": ["A01"]}, {"slug": "akkordutvidelser", "title": "Akkordutvidelser: 9, 11 og 13 i spillbare klanger", "modules": ["P02", "E02"]}, {"slug": "modal-harmonikk-i-praksis", "title": "Modal harmonikk i praksis: hold sentrum mens klangene skifter", "modules": ["A02", "I03"]}, {"slug": "tonikalisering-og-modulering", "title": "Tonikalisering og modulering: følg lokal og global tonalitet", "modules": ["A01", "I02"]}, {"slug": "sekstkvart-bass-og-kadens", "title": "Sekstkvartakkorder: hør hva bassen gjør", "modules": ["I02", "A03"]}, {"slug": "satb-tendenstoner-og-dobling", "title": "SATB: fordel stemmer og løs tendensene", "modules": ["A03"]}, {"slug": "modal-interchange-og-kromatiske-medianter", "title": "Modal interchange og kromatiske medianter: lånt farge med retning", "modules": ["P01", "A02"]}, {"slug": "napolitansk-og-forstorret-sekst", "title": "Napolitansk akkord og forstørret sekst: to veier mot dominanten", "modules": ["P01"]}, {"slug": "tritonussubstitusjon-og-reharmonisering", "title": "Tritonussubstitusjon: samme guide-toner, ny bass", "modules": ["A03", "P02"]}, {"slug": "kontrapunkt-to-selvstendige-stemmer", "title": "Kontrapunkt: skriv to linjer som kan stå alene", "modules": ["P03"]}, {"slug": "dissonans-gjennomgang-og-forholdning", "title": "Dissonansbehandling: gjennomgangstoner og forholdninger", "modules": ["P03", "A03"]}, {"slug": "imitasjon-kanon-og-partimento", "title": "Imitasjon, kanon og partimento: la en idé skape sats", "modules": ["P03"]}, {"slug": "melodisk-moll-og-akkordskala", "title": "Melodisk moll: fra tonesett til akkord–skala-valg", "modules": ["P02", "I03"]}, {"slug": "altererte-dominanter-og-symmetriske-skalaer", "title": "Altered, heltoner og diminished: velg spenning med et mål", "modules": ["P02"]}, {"slug": "kvartklanger-cluster-og-polykorder", "title": "Kvartklanger, cluster og polykorder: organiser en tett overflate", "modules": ["X02"]}, {"slug": "motiv-og-transformasjon", "title": "Motivisk utvikling: få mer musikk ut av fire toner", "modules": ["X03", "I04"]}, {"slug": "frase-periode-og-harmonisk-rytme", "title": "Frase og periode: la kadensen forme musikken", "modules": ["X01", "I02"]}, {"slug": "storform-rondo-sonatisk-og-dramaturgi", "title": "Storform: rondo, sonatisk tenkning og gjennomkomponering", "modules": ["X03", "X01"]}, {"slug": "komposisjon-fra-skisse-til-revisjon", "title": "Komposisjon: fra første skisse til en begrunnet revisjon", "modules": ["X03"]}, {"slug": "arrangering-for-lite-ensemble", "title": "Arrangering: gi hvert instrument en tydelig oppgave", "modules": ["P04"]}, {"slug": "instrumentasjon-og-hybrid-metal", "title": "Instrumentasjon: bygg balanse mellom metal og orkesterlag", "modules": ["P04"]}, {"slug": "swing-bebop-og-jazzfrasering", "title": "Swing og bebop: rytmisk retning over akkordskifter", "modules": ["I04", "P02"]}, {"slug": "comping-og-akkordmelodi", "title": "Comping og akkordmelodi: støtt frasen med få toner", "modules": ["P02", "A03"]}, {"slug": "gehor-og-transkripsjon", "title": "Gehør og transkripsjon: fra lytting til etterprøvbar notasjon", "modules": ["E04"]}, {"slug": "rytmikk-oddetakt-og-metrisk-modulasjon", "title": "Rytmikk: oddetakt, forskyvning og metrisk modulasjon", "modules": ["A04"]}, {"slug": "logic-midi-og-opptak", "title": "Logic Pro: bygg en ryddig skisse med MIDI og gitaropptak", "modules": ["P04"]}, {"slug": "miks-balanse-og-kritisk-lytting", "title": "Miks og kritisk lytting: gjør arrangementets hensikt hørbar", "modules": ["P04"]}, {"slug": "portefolje-kunstnerisk-refleksjon-og-samspill", "title": "Portefølje og kunstnerisk refleksjon: vis sammenhengen i arbeidet", "modules": ["X04"]}, {"slug": "auditiv-intervall-og-funksjonsprove", "title": "Auditiv kontroll: hør intervall og funksjon uten synlig fasit", "modules": ["F03", "I01"]}, {"slug": "samspill-og-improvisatorisk-respons", "title": "Samspill: lytt, gi plass og svar på en medspiller", "modules": ["I04"]}, {"slug": "formanalyse-av-hele-verk", "title": "Formanalyse av hele verk: bind detaljene til et kart", "modules": ["X01"]}, {"slug": "utovende-presentasjon-og-sluttprosjekt", "title": "Utøvende presentasjon: gjør et verk klart for gjennomspilling", "modules": ["X04"]}];
const linksByModule=new Map(catalog.map(m=>[m.id,[]]));
for(const {slug,title,modules} of articleLinks){
 for(const id of modules)linksByModule.get(id).push({slug,title});
}
const english=document.documentElement?.lang==="en";
const firstArticle="toner-og-intervaller";
const branchResources = {
 gehor: [
  {url:"teori.html?topic=intervals",title:english?"Listen to intervals in the Theory Room":"Lytt til intervaller i Teorirommet"},
  ...(!english ? [
   {url:"artikler/gehor-og-transkripsjon.html",title:"Gehør og transkripsjon"},
   {url:"artikler/auditiv-intervall-og-funksjonsprove.html",title:"Auditiv intervall- og funksjonsprøve"},
   {url:"artikler/stilforstaelse-repertoar-og-lytteanalyse.html",title:"Stilforståelse og lytteanalyse"}
  ] : [])
 ],
 gitar: [
  {url:"skalabibliotek.html",title:"MODUS Fretboard"},
  {url:"backingtracks.html",title:"MODUS JAM"},
  ...(!english ? [{url:"artikler/gitarteknikk-metal-fusion-og-oving.html",title:"Gitarteknikk og metal/fusion"}] : [])
 ],
 skala: [{url:"skalabibliotek.html",title:"MODUS Fretboard"}],
 impro: [{url:"backingtracks.html",title:"MODUS JAM"}],
 harmoni: [{url:"akkorder.html",title:"MODUS HARMONI"}]
};
const moduleResources = {
 I03: [
  {url:"skalabibliotek.html",title:"MODUS Fretboard"},
  ...(!english ? [
   ["ionisk","Ionisk"], ["dorisk-fra-d-over-a","Dorisk"], ["frygisk","Frygisk"],
   ["lydisk","Lydisk"], ["miksolydisk","Miksolydisk"], ["eolisk","Eolisk"], ["lokrisk","Lokrisk"]
  ].map(([slug,title])=>({url:"artikler/"+slug+".html",title})) : [])
 ]
};
function matchesBranch(group) {
 return (group.name+" "+(branchResources[group.id]||[]).map(resource=>resource.title).join(" ")).toLowerCase().includes(search);
}
function matchesModule(m){
 return (m.id+" "+m.title+" "+[...linksByModule.get(m.id),...(moduleResources[m.id]||[])].map(a=>a.title).join(" ")).toLowerCase().includes(search);
}
const articleEvidenceKey='modus.atlas.article-evidence.v1';
function articleEvidence(){try{const data=JSON.parse(localStorage.getItem(articleEvidenceKey)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
function evidenceState(moduleId){
 const ids=Object.keys(articleModules).filter(id=>articleModules[id]===moduleId);
 if(!ids.length)return 'not-started';
 const seen=articleEvidence();
 const completed=id=>seen[id]?.passed===true||localStorage.getItem('modus.article-quiz.v1.'+id)==='passed'||window.ModusAccount?.has?.(id)===true;
 try{
  if(ids.every(completed))return 'learned';
  if(ids.some(id=>seen[id]?.opened===true||completed(id)))return 'exploring';
 }catch{
  if(ids.some(id=>seen[id]?.opened===true||seen[id]?.passed===true))return 'exploring';
 }
 return 'not-started';
}
function moduleState(id){return records[id]?.manual?records[id].state:evidenceState(id);}
const categoryRecords={};for(const g of groups){categoryRecords[g.id]=valid.has(stored._categories?.[g.id])?stored._categories[g.id]:"not-started";}
let chosen=null,category=null,search="";
const svg=$("music-map");
function svgEl(tag,attr={},content){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attr))e.setAttribute(k,String(v));if(content!==undefined)e.textContent=content;return e;}
function save(){try{localStorage.setItem(STORE,JSON.stringify({...records,_categories:categoryRecords}));$("map-save-status").textContent="Lagret i denne nettleseren.";}catch{$("map-save-status").textContent="Nettleseren tillot ikke lagring. Bruk eksport for å ta vare på kartleggingen.";}}
function groupModules(g){return g.ids.map(id=>byId.get(id)).filter(Boolean);}
function groupState(g){const a=groupModules(g);if(!a.length)return categoryRecords[g.id];const num=a.filter(m=>moduleState(m.id)==="learned").length;const active=a.some(m=>moduleState(m.id)!=="not-started");return num===a.length?"learned":active?"exploring":"not-started";}
function variant(state){return state==="learned"?"on":state==="exploring"?"mid":"off";}
function activityState(id){return moduleState(id);}
function curve(x1,y1,x2,y2,color,state,width){return svgEl("path",{d:"M "+x1+" "+y1+" C "+(x1+135)+" "+y1+", "+(x2-140)+" "+y2+", "+x2+" "+y2,stroke:color,"stroke-width":width,class:"map-branch "+variant(state),style:"color:"+color});}
function node(x,y,w,h,label,color,state,type,id){
 const group=svgEl("g",{class:"map-node "+variant(state)+" "+type+(chosen===id||category===id?" selected":""),role:"button",tabindex:"0","data-atlas-id":id,"aria-controls":"inspector-module","aria-pressed":String((chosen||category)===id),"aria-label":label+". "+(state==="learned"?"Egenvurdert lært":state==="exploring"?"Under arbeid":"Ikke gjennomgått")});
 const rect=svgEl("rect",{x,y:y-h/2,width:w,height:h,rx:11,fill:type==="root-node"?"#d7f48c":"#1b231b",stroke:color,style:"color:"+color});
 const txt=svgEl("text",{x:x+18,y:y+5},label);
 group.append(rect,txt);
 group.addEventListener("click",()=>choose(type==="branch-node"?"category":"module",id));
 group.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose(type==="branch-node"?"category":"module",id);}});
 return group;
}
function render(){
 const focused=svg.contains?.(document.activeElement)?document.activeElement.dataset.atlasId:null;
 svg.replaceChildren();
 const layer=svgEl("g",{});
 // The entire musical landscape is always visible. Selection changes only emphasis and details.
 const leftIds=["harmoni","rytme","gehor","impro","produksjon"];
 const rightIds=["grunnlag","skala","gitar","komposisjon","praksis"];
 const branchBand=g=>Math.max(105,groupModules(g).length*34+42);
 const sideHeight=ids=>ids.reduce((sum,id)=>sum+branchBand(groups.find(g=>g.id===id)),64+9*(ids.length-1));
 const W=1600,H=Math.max(940,sideHeight(leftIds),sideHeight(rightIds)),midX=800,midY=H/2;
 svg.setAttribute("viewBox","0 0 "+W+" "+H);
 svg.setAttribute("preserveAspectRatio","xMidYMid meet");
 function curved(x1,y1,x2,y2,color,state,weight){
  const reach=Math.abs(x2-x1),sign=Math.sign(x2-x1);
  return svgEl("path",{
   d:"M "+x1+" "+y1+" C "+(x1+sign*reach*.48)+" "+y1+", "+(x2-sign*reach*.48)+" "+y2+", "+x2+" "+y2,
   stroke:color,"stroke-width":weight,class:"map-branch "+variant(state),style:"color:"+color});
 }
 function branchLayout(ids,left){
  const list=ids.map(id=>groups.find(g=>g.id===id));
  const bands=list.map(branchBand);
  const total=bands.reduce((a,b)=>a+b,0),gap=Math.max(9,(H-64-total)/(list.length-1));
  let top=32;
  list.forEach((g,i)=>{
   const modules=groupModules(g),y=top+bands[i]/2;
   const state=groupState(g);
   const catX=left?420:940,catW=240,catH=43;
   const rootEdge=left?midX-68:midX+68;
   const catEdge=left?catX+catW:catX;
   layer.append(curved(rootEdge,midY,catEdge,y,g.color,state,4.2));
   const categoryNode=node(catX,y,catW,catH,g.name,g.color,state,"branch-node",g.id);
   if(search && (matchesBranch(g)||modules.some(matchesModule)))categoryNode.classList.add("match");
   layer.append(categoryNode);
   const leafGap=34,leafStart=y-(modules.length-1)*leafGap/2;
   modules.forEach((m,j)=>{
    const ly=leafStart+j*leafGap,leafX=left?33:1227;
    layer.append(curved(left?catX:catX+catW,y,left?leafX+337:leafX,ly,g.color,activityState(m.id),2.3));
    const leaf=node(leafX,ly,337,29,m.id+" · "+m.title,g.color,activityState(m.id),"module-node",m.id);
    if(search && matchesModule(m))leaf.classList.add("match");
    layer.append(leaf);
   });
   if(!modules.length){
    const label=svgEl("text",{x:left?145:1230,y:y+36,fill:g.color,"font-size":14,"font-family":"Manrope,Arial,sans-serif","opacity":.95},
      english?"Explore linked resources":"Utforsk tilknyttet innhold");
    layer.append(label);
   }
   top+=bands[i]+gap;
  });
 }
 branchLayout(leftIds,true);
 branchLayout(rightIds,false);
 const hub=svgEl("g",{class:"atlas-globe",role:"img","aria-label":"Tredimensjonal trådglobus – Mitt musikkatlas"});
 // A restrained vector wireframe: faint reverse hemisphere, luminous front hemisphere,
 // and narrow meridians suggest depth without a heavy solid container.
 const definitions=svgEl("defs");
 const glow=svgEl("radialGradient",{id:"atlas-globe-halo",cx:"50%",cy:"42%",r:"65%"});
 glow.append(svgEl("stop",{offset:"0%","stop-color":"#aac88b","stop-opacity":".13"}));
 glow.append(svgEl("stop",{offset:"78%","stop-color":"#87a67a","stop-opacity":".035"}));
 glow.append(svgEl("stop",{offset:"100%","stop-color":"#87a67a","stop-opacity":"0"}));
 definitions.append(glow);
 hub.append(definitions);
 const radius=69;
 hub.append(svgEl("circle",{cx:midX,cy:midY,r:88,fill:"url(#atlas-globe-halo)"}));
 hub.append(svgEl("circle",{cx:midX,cy:midY,r:radius,fill:"#15241b","fill-opacity":".84",stroke:"#6f8d70","stroke-width":"1.1"}));
 const back=svgEl("g",{class:"atlas-globe-back"});
 // Rear-facing latitude arcs, glimpsed as a transparent technical illustration.
 for(const offset of [-42,-23,0,23,42]){
   const scale=Math.sqrt(1-(offset/radius)**2);
   back.append(svgEl("path",{d:"M "+(midX-radius*scale)+" "+(midY+offset)+" Q "+midX+" "+(midY+offset+scale*17)+" "+(midX+radius*scale)+" "+(midY+offset),fill:"none",stroke:"#64836f","stroke-width":".7"}));
 }
 back.append(svgEl("ellipse",{cx:midX,cy:midY,rx:26,ry:radius,fill:"none",stroke:"#62826b","stroke-width":".8"}));
 hub.append(back);
 const front=svgEl("g",{class:"atlas-globe-front",transform:"rotate(-19 "+midX+" "+midY+")"});
 // Meridians and parallels intersect on the spherical face, creating subtle 3D perspective.
 for(const rx of [25,47]){
   front.append(svgEl("ellipse",{cx:midX,cy:midY,rx,ry:radius,fill:"none",stroke:"#a2c28d","stroke-width":"1.15"}));
 }
 for(const offset of [-43,-23,0,23,43]){
   const half=Math.sqrt(radius*radius-offset*offset);
   const bow=(offset===0?15:Math.max(4,15-Math.abs(offset)*.16));
   front.append(svgEl("path",{d:"M "+(midX-half)+" "+(midY+offset)+" Q "+midX+" "+(midY+offset-bow)+" "+(midX+half)+" "+(midY+offset),fill:"none",stroke:"#a1bf8c","stroke-width":offset===0?1.3:1.05}));
 }
 hub.append(front);
 hub.append(svgEl("circle",{cx:midX,cy:midY,r:radius,fill:"none",stroke:"#bddb9f","stroke-width":"1.5"}));
 hub.append(svgEl("path",{d:"M "+(midX-36)+" "+(midY-53)+" Q "+(midX-9)+" "+(midY-70)+" "+(midX+13)+" "+(midY-60),fill:"none",stroke:"#e0f1c8","stroke-width":"1.25",opacity:".8"}));
 hub.append(svgEl("text",{x:midX,y:midY+95,class:"atlas-globe-caption","text-anchor":"middle"},"MITT MUSIKKATLAS"));
 layer.append(hub);
 svg.append(layer);
 if(focused)svg.querySelector('[data-atlas-id="'+focused+'"]')?.focus({preventScroll:true});
 $("map-count").textContent=groups.length+" fagområder · "+catalog.length+" synlige moduler";
 $("map-learned").textContent=catalog.filter(m=>moduleState(m.id)==="learned").length;
 $("map-exploring").textContent=catalog.filter(m=>moduleState(m.id)==="exploring").length;
 $("map-planned").textContent=catalog.filter(m=>records[m.id].idea).length;
 for(const b of $("inspector-module").querySelectorAll("[data-state]")){
   const g=groups.find(g=>g.id===category);
   const state=chosen?moduleState(chosen):g?groupState(g):"not-started";
   b.setAttribute("aria-pressed",String(b.dataset.state===state));
 }
}

function choose(type,id){
 const g=type==="category"?groups.find(x=>x.id===id):null;
 const m=type==="module"?byId.get(id):null;
 if(!m&&!g)return;
 chosen=m?.id||null;category=g?.id||(m?groups.find(group=>group.ids.includes(m.id))?.id:null)||null;
 $("inspector-module").hidden=false;
 $("inspector-heading").textContent=m?m.title:g.name;
 $("inspector-description").textContent=m?"Atlaset følger åpnete artikler og fullførte quizer. Du kan også velge en egen status som overstyrer den automatiske statusen. Bestått quiz er ikke en faglig godkjenning.":"Dette fagområdet samler "+g.ids.length+" planlagte moduler. Endrer du status her, får alle modulene i grenen samme egenvurderte status.";
 $("inspector-meta").textContent=m?"MODUL "+m.id+" · NIVÅ "+m.level:"FAGOMRÅDE · "+g.ids.length+" MODULER";
 $("map-personal-note").disabled=!m;
 $("map-personal-note").value=m?records[m.id].note:"";
 $("course-idea").disabled=!m;
 $("course-idea").checked=m?records[m.id].idea:false;
 const intervals=m?.id===articleModules[firstArticle];
 const links=m?linksByModule.get(m.id):[];
 const linkedUrls=new Set(links.map(({slug})=>"artikler/"+slug+".html"));
 const resources=(g?branchResources[g.id]:moduleResources[m.id])||[];
 const extra=resources.filter(({url})=>!linkedUrls.has(url));
 if(g&&!g.ids.length&&resources.length){
  $("inspector-description").textContent=english
   ?"Explore the resources below and mark your own progress in this subject."
   :"Utforsk ressursene under og marker din egen progresjon i dette fagområdet.";
  $("inspector-meta").textContent=english?"SUBJECT":"FAGOMRÅDE";
 }
 const first=intervals?links.find(a=>a.slug===firstArticle):null;
 $("module-open").href=first?"artikler/"+first.slug+".html":"laereplan.html";
 $("module-open").textContent=first
  ? (english?"Read Notes and Intervals":"Les Toner og intervaller")
  : (english?"View the curriculum":"Se læreplanen");
 $("module-practice").hidden=!first;
 const reading=links.filter(a=>a!==first);
 $("atlas-reading").hidden=!(reading.length||extra.length);
 $("atlas-reading-title").textContent=resources.length
  ? (english?"Resources":"Ressurser")
  : first
  ? (english?"More theory articles":"Flere teoriartikler")
  : (english?"Theory articles":"Teoriartikler");
 $("atlas-articles").replaceChildren(...[...reading.map(({slug,title})=>({url:"artikler/"+slug+".html",title})),...extra].map(({url,title})=>{
  const li=document.createElement("li"),link=document.createElement("a");
  link.href=url;
  link.textContent=title;
  li.append(link);
  return li;
 }));
 $("map-save-status").textContent="";
 render();
}
$("inspector-module").querySelectorAll("[data-state]").forEach(b=>b.addEventListener("click",()=>{
 const state=b.dataset.state;if(!valid.has(state))return;
 if(chosen){records[chosen].state=state;records[chosen].manual=true;}
 else if(category){const g=groups.find(g=>g.id===category);if(g.ids.length){for(const id of g.ids){records[id].state=state;records[id].manual=true;}}else categoryRecords[g.id]=state;}
 save();render();
}));
$("map-personal-note").addEventListener("input",e=>{if(chosen){records[chosen].note=e.target.value.slice(0,2000);save();}});
$("course-idea").addEventListener("change",e=>{if(chosen){records[chosen].idea=e.target.checked;save();render();}});
$("map-search").addEventListener("input",e=>{
 search=e.target.value.trim().toLowerCase();
 // Search highlights matching leaves; the illustrated map stays complete.
 render();
});
$("map-reset").addEventListener("click",()=>{
 $("map-search").value="";search="";category=null;chosen=null;
 $("inspector-module").hidden=true;
 $("inspector-heading").textContent="Velg et område";
 $("inspector-description").textContent="Hele kartet vises samtidig. Velg et emne for å markere din egen læringsstatus.";
 render();
});
$("map-export").addEventListener("click",()=>{
 const payload={type:"modus-music-map-self-assessment",version:1,exportedAt:new Date().toISOString(),meaning:"Private self-assessment; not accredited or verified learning",records,categories:categoryRecords};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download="modus-musikkart.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("map-clear").addEventListener("click",()=>{
 if(!window.confirm("Nullstille all synlig progresjon og alle notater i Musikkatlaset? Quizresultater på kontoen beholdes."))return;
 // Explicitly mark every module as not started, overriding previously imported
 // article/quiz evidence in the atlas without deleting actual quiz results.
 for(const m of catalog)records[m.id]={state:"not-started",manual:true,idea:false,note:""};
 for(const g of groups)categoryRecords[g.id]="not-started";
 save();
 chosen=null;category=null;$("inspector-module").hidden=true;$("inspector-heading").textContent="Velg et område";$("inspector-description").textContent="Alle atlasmarkeringer er nullstilt. Tidligere quizresultater på kontoen er beholdt.";render();
});
const requestedModule=new URLSearchParams(window.location?.search).get("modul");
if(requestedModule===articleModules[firstArticle])choose("module",requestedModule);
else render();
window.addEventListener('pageshow',render);
window.addEventListener('storage',event=>{if(!event.key||event.key===articleEvidenceKey||event.key.startsWith('modus.article-quiz.v1.'))render();});
document.addEventListener('modus-account-change',render);
if(window.ModusAccount?.ready)Promise.resolve(window.ModusAccount.ready).then(render).catch(()=>{});
})();
