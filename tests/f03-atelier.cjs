"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const code=fs.readFileSync("dist/f03-atelier.js","utf8");
class Node{
 constructor(id=""){this.id=id;this.children=[];this.listeners={};this.dataset={};this.attrs={};this.style={};this.className="";this.textContent="";this.value="easy";this.disabled=false;this.classList={toggle:(name,enabled)=>{const classes=new Set(this.className.split(" ").filter(Boolean));if(enabled)classes.add(name);else classes.delete(name);this.className=[...classes].join(" ");}};}
 append(node){this.children.push(node);}
 replaceChildren(){this.children=[];}
 setAttribute(name,value){this.attrs[name]=value;}
 getAttribute(name){return this.attrs[name];}
 addEventListener(type,listener){this.listeners[type]=listener;}
 querySelectorAll(tag){assert.equal(tag,"button");return this.children.filter(c=>c.tag==="button");}
 click(){assert(this.listeners.click, "Click event missing for "+this.id);return this.listeners.click();}
 change(){assert(this.listeners.change);return this.listeners.change();}
}
const ids=["f03-draft","f03-piano","f03-fretboard","f03-visual-status","f03-difficulty","f03-new-question","f03-listen","f03-again","f03-ear-answers","f03-ear-feedback"];
const nodes=new Map(ids.map(id=>[id,new Node(id)]));
const opts=[2,4,7].map(value=>{const n=new Node();n.dataset.interval=String(value);n.attrs["aria-pressed"]=String(value===2);return n;});
const calls=[];
const document={getElementById:id=>nodes.get(id)||null,createElement:tag=>{const n=new Node();n.tag=tag;return n;},querySelectorAll:selector=>{assert.equal(selector,"[data-interval]");return opts;},querySelector:selector=>{assert.equal(selector,'[data-interval][aria-pressed="true"]');return opts.find(x=>x.attrs["aria-pressed"]==="true");}};
const window={MODUSGrand:{playMidi:async (...args)=>{calls.push(args);}}};
vm.runInNewContext(code,{document,window,URLSearchParams,location:{search:"?modul=F03"},Math,Number,Set,Object,Array});
assert.equal(nodes.get("f03-piano").children.length,25,"Two-octave keyboard");
assert.equal(nodes.get("f03-fretboard").children.length,6*14+14,"Six strings, 13 fret positions and labels");
assert.equal(nodes.get("f03-ear-answers").children.length,2,"Easy has two interval choices");
assert.match(nodes.get("f03-visual-status").textContent,/skjult/,"Ear notes must be hidden");
nodes.get("f03-ear-answers").children[0].click();
assert.match(nodes.get("f03-ear-feedback").textContent,/egenkontroll|dokumentert mestring/i);
assert.match(nodes.get("f03-visual-status").textContent,/Svaret er/);
nodes.get("f03-new-question").click();
assert.match(nodes.get("f03-visual-status").textContent,/skjult/);
nodes.get("f03-difficulty").value="hard";nodes.get("f03-difficulty").change();
assert.equal(nodes.get("f03-ear-answers").children.length,5,"Hard has five interval choices");
nodes.get("f03-listen").click();
setImmediate(()=>{
 assert.equal(calls.length,1);
 assert.equal(calls[0][0].length,2,"Exactly two acoustic piano notes");
 assert(calls[0][0][0]>=55 && calls[0][0][1]<=71,"Root and target stay within available piano sample range");
 console.log("F03 interactive tests passed (piano, guitar, ear training, mask, difficulty, replay).");
});
