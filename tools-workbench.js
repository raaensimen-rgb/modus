(function () {
  'use strict';
  const model=ModusTools, audio=ModusToolSamples, en=document.documentElement.lang==='en';
  const t=(nb,english)=>en?english:nb;
  const app=document.querySelector('[data-modus-tool]');
  const params=new URLSearchParams(location.search);
  const $=id=>document.getElementById(id);
  const modes=model.modes.map(([id,nb,english])=>[id,t(nb,english)]);
  const roots=model.roots.map(root=>[root,root]);
  const qualities=Object.entries(model.qualities).map(([id,[,nb,english]])=>[id,t(nb,english)]);
  const status=text=>$('tool-status').textContent=text;
  function select(label, entries, value, onChange) {
    const field=document.createElement('label'), input=document.createElement('select');
    field.append(label,input);
    for(const [id,name] of entries) input.add(new Option(name,id));
    input.value=value;
    input.addEventListener('change',()=>onChange(input.value));
    return field;
  }
  function button(label, action) {
    const control=document.createElement('button');
    control.type='button'; control.textContent=label; control.onclick=action;
    return control;
  }
  const validRoot=value=>model.roots.includes(value)?value:'C';
  const validMode=value=>modes.some(([id])=>id===value)?value:'ionian';
  if (app.dataset.modusTool==='fretboard') {
    const picker=$('tool-controls'), board=$('fretboard-scroll');
    let tonic=validRoot(params.get('root')?.replace('#','♯')), mode=validMode(params.get('mode'));
    let display=['notes','intervals','degrees'].includes(params.get('view'))?params.get('view'):'notes';
    let isolated=params.get('form')==='1';
    let shape='scale', all=false, range=['0-12','12-24','0-24'].includes(params.get('range'))?params.get('range'):'0-24';
    const panel=app.querySelector('.tool-panel');
    const practice=button(t('Øvingsvisning','Practice view'),()=>{
      const on=panel.classList.toggle('fretboard-practice');
      practice.setAttribute('aria-pressed',String(on));
      render();
    });
    panel.classList.toggle('fretboard-practice',params.get('practice')==='1');
    practice.setAttribute('aria-pressed',String(panel.classList.contains('fretboard-practice')));
    const fullscreen=button(t('Fullskjerm','Fullscreen'),async()=>{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(panel.classList.contains('tool-fullscreen')){exitExpanded();return;}
      try {await panel.requestFullscreen();}
      catch {panel.classList.add('tool-fullscreen');fullscreen.setAttribute('aria-pressed','true');}
    });
    fullscreen.setAttribute('aria-pressed','false');
    function exitExpanded(){
      panel.classList.remove('tool-fullscreen');fullscreen.setAttribute('aria-pressed','false');fullscreen.focus();
    }
    document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-pressed',String(!!document.fullscreenElement)));
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('tool-fullscreen'))exitExpanded();});
    board.addEventListener('keydown',event=>{
      if(event.target!==board||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      const max=board.scrollWidth-board.clientWidth;
      const next={ArrowLeft:board.scrollLeft-120,ArrowRight:board.scrollLeft+120,Home:0,End:max}[event.key];
      if(next===undefined||max<1)return;
      event.preventDefault();board.scrollLeft=Math.max(0,Math.min(max,next));
    });
    let preview=0;
    async function play(midi) {
      const token=++preview;
      audio.stop();
      try {
        await audio.start();
        const sample=await audio.sample(midi);
        if (token===preview) audio.schedule(sample,audio.now()+.015,.8,.23);
      } catch {if(token===preview) status(t('Lyden kunne ikke lastes.','Audio could not load.'));}
    }
    picker.append(
      select(t('Grunntone','Root'),roots,tonic,v=>{tonic=v;render();}),
      select(t('Skala','Scale'),modes,mode,v=>{mode=v;render();}),
      select(t('Toneutvalg','Note set'),[['scale',t('Valgt skala','Selected scale')],...qualities],shape,v=>{shape=v;if(shape!=='scale')isolated=false;render();}),
      select(t('Vis som','Display'),[['notes',t('Tonenavn','Note names')],['intervals',t('Intervaller','Intervals')],['degrees',t('Trinn','Degrees')]],display,v=>{display=v;render();}),
      select(t('Bånd','Frets'),[['0-12','0–12'],['12-24','12–24'],['0-24','0–24']],range,v=>{range=v;render();})
    );
    const toggle=button(t('Vis alle toner','Show all notes'),()=>{
      all=!all; toggle.setAttribute('aria-pressed',String(all)); render();
    });
    toggle.setAttribute('aria-pressed','false'); picker.append(toggle);
    const arpeggio=button(t('Spill arpeggio','Play arpeggio'),async()=>{
      const midi=model.chord(tonic,shape).midi;
      const token=++preview;
      audio.stop();
      try {
        await audio.start();
        const notes=await Promise.all(midi.map(audio.sample));
        if(token!==preview)return;
        const start=audio.now()+.035;
        notes.forEach((note,index)=>audio.schedule(note,start+index*.22,.6,.19));
      } catch {if(token===preview) status(t('Lyden kunne ikke lastes.','Audio could not load.'));}
    });
    const isolate=button(t('Isoler modusform','Isolate mode shape'),()=>{
      isolated=!isolated;
      render();
    });
    const formInfo=document.createElement('p');
    formInfo.className='tool-form-info';
    board.before(formInfo);
    picker.append(arpeggio,isolate,practice,fullscreen);

    // Ascend three successive scale degrees per string, from low E to high E.
    function scaleForm(tones) {
      const root=ModusScales.parse(tonic).pc;
      const start=model.open[0]+model.mod(root-model.open[0]);
      const positions=new Set();
      model.open.forEach((open,string)=>{
        for(let column=0;column<3;column++){
          const degree=3*string+column;
          const midi=start+12*Math.floor(degree/7)+tones[degree%7].offset;
          const fret=midi-open;
          if(fret>=0&&fret<=24)positions.add((6-string)+':'+fret);
        }
      });
      return positions;
    }

    function render() {
      arpeggio.hidden=shape==='scale';
      const tones=shape==='scale'?model.scale(tonic,mode):model.chord(tonic,shape).tones;
      $('tone-set').textContent=tones.map(n=>n.name+' · '+n.degree).join('   /   ');
      const detail=$('fret-description');
      const modeId=({major:'ionian',naturalMinor:'aeolian'})[mode]||mode;
      const modeIndex=ModusScales.ids.indexOf(modeId);
      const localized=window.ModusTheoryData.modes[modeIndex];
      const colors=['Major seventh.','Bright major sixth.','Minor second.','Raised fourth.','Minor seventh.','Minor sixth.','Diminished fifth.'];
      const parent=modeIndex>=0&&shape==='scale'?tones[(7-modeIndex)%7].name:null;
      detail.textContent=(parent?t('Foreldreskala: '+parent+'-dur. '+localized.color,'Parent scale: '+parent+' major. '+colors[modeIndex])+' ':'')+
        t('Internasjonalt B tilsvarer norsk H. Rull vannrett for flere bånd.','Scroll horizontally for more frets.');
      const form=isolated?scaleForm(tones):null;
      isolate.disabled=shape!=='scale';
      isolate.setAttribute('aria-pressed',String(isolated));
      formInfo.hidden=!form;
      formInfo.textContent=t('Tre toner per streng, fra grunntonen på tykk E.','Three notes per string, starting on the root on low E.');
      const formFrets=form?[...form].map(position=>Number(position.split(':')[1])):[];
      const [first,last]=form
        ? [Math.max(0,Math.min(...formFrets)-1),Math.min(24,Math.max(...formFrets)+1)]
        : range.split('-').map(Number);
      picker.querySelectorAll('select')[4].disabled=!!form;
      toggle.disabled=!!form;
      const width=form?650:first===0&&last===24?1800:1200, height=390, left=65, nut=132, right=width-24;
      const physical=fret=>1-2**(-fret/12);
      const origin=physical(Math.max(0,first-1)), span=physical(last)-origin;
      const wire=fret=>nut+(right-nut)*(physical(fret)-origin)/span;
      const centre=fret=>fret===0?(left+nut)/2:(wire(fret-1)+wire(fret))/2;
      const y=(x,string)=>{
        const fullPosition=origin+(x-nut)/(right-nut)*span;
        return 80+(string-1)*43+fullPosition*(-32+(string-1)*13);
      };
      const top=x=>y(x,1)-23, bottom=x=>y(x,6)+23;
      const frets=Array.from({length:last-first+1},(_,i)=>first+i);
      const line=(css,x1,y1,x2,y2,extra='')=>`<line class="${css}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
      const text=(x,y,label)=>`<text x="${x}" y="${y}">${label}</text>`;
      const strings=['E','B','G','D','A','E'];
      const neck=document.createElement('div');
      neck.className=form?'tool-neck is-form':'tool-neck';neck.style.setProperty('--neck-width',width+'px');
      neck.style.setProperty('--fretboard-height', (100*height/width)+'cqw');
      neck.style.setProperty('--fretboard-note', (100*30/width)+'cqw');
      const inlays=[3,5,7,9,12,15,17,19,21,24].filter(f=>frets.includes(f)).flatMap(f=>
        (f%12===0?[2.5,4.5]:[3.5]).map(string=>`<circle class="tool-inlay" cx="${centre(f)}" cy="${y(centre(f),string)}" r="5"/>`));
      neck.innerHTML=`<svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 ${width} ${height}">
        <path class="tool-neck-edge" d="M ${nut} ${top(nut)} L ${right} ${top(right)} L ${right} ${bottom(right)} L ${nut} ${bottom(nut)} Z"/>
        ${inlays.join('')}
        ${line(first===0?'tool-nut':'tool-wire',nut,top(nut),nut,bottom(nut))}
        ${frets.filter(f=>f>0).map(f=>line('tool-wire',wire(f),top(wire(f)),wire(f),bottom(wire(f)),`data-fret-wire="${f}"`)).join('')}
        ${strings.map((name,i)=>text(28,y(left,i+1),name)+line('tool-string',first===0?left:nut,y(first===0?left:nut,i+1),right,y(right,i+1),`style="stroke-width:${1+i*.24}"`)).join('')}
        ${frets.map(f=>text(centre(f),height-26,f)).join('')}
        </svg>`;
      const chromatic=model.roots.slice(0,12);
      [...model.open].reverse().forEach((open,index)=>{
        for(const fret of frets){
          const midi=open+fret, note=tones.find(n=>n.pc===midi%12);
          if(form?!form.has((index+1)+':'+fret):!note&&!all)continue;
          const name=note?.name||chromatic[midi%12];
          const label=display==='notes'?name:display==='intervals'?note?.degree:note?.step;
          const description=name+' · '+t('Streng','String')+' '+(index+1)+' · '+t('Bånd','Fret')+' '+fret;
          const key=button(label??'·',()=>{status(description);play(midi);});
          key.className='tool-neck-note '+(note?.root?'tool-tonic':note?.character?'tool-character':note?'tool-member':'tool-other');
          key.setAttribute('aria-label',description);
          key.style.left=(100*centre(fret)/width)+'%';
          key.style.top=(100*y(centre(fret),index+1)/height)+'%';
          key.dataset.midi=midi;key.dataset.fret=fret;key.dataset.string=index+1;
          neck.append(key);
        }
      });
      const scroll=board.scrollLeft;
      board.replaceChildren(neck);
      board.scrollLeft=form?0:scroll;
      const query={root:tonic,mode,view:display,range};
      if(panel.classList.contains('fretboard-practice'))query.practice='1';
      if(isolated)query.form='1';
      if(params.get('fromArticle'))query.fromArticle=params.get('fromArticle');
      window.ModusLanguage=window.ModusLanguage||{};
      window.ModusLanguage.query=()=>query;
      const alternate=app.querySelector('a[hreflang]');
      alternate.search=new URLSearchParams(query).toString();
      const url=new URL(location.href);
      for(const [key,value] of Object.entries(query))url.searchParams.set(key,value);
      if(!query.practice)url.searchParams.delete('practice');
      if(!query.form)url.searchParams.delete('form');
      if(url.href!==location.href){
        try {history.replaceState(null,'',url);}
        catch(error){if(error.name!=='SecurityError')throw error;}
      }
    }
    render();
    return;
  }
  const storageKey='modus.composition-lab.v1';
  const defaults={tonic:'C',mode:'ionian',bpm:96,chords:[]};
  let state={...defaults}, token=0, timers=[];
  let original=null, variant=null, changedBar=null;
  function normalize(raw) {
    if(!raw||!Array.isArray(raw.chords)) return null;
    const bpm=raw.bpm==null?96:Number(raw.bpm);
    return {tonic:validRoot(raw.tonic),mode:validMode(raw.mode),bpm:Number.isFinite(bpm)?Math.max(40,Math.min(220,Math.round(bpm))):96,
      chords:raw.chords.slice(0,24).flatMap(rawChord=>{
        const item=model.normalizeChord(rawChord);
        if(!item)return [];
        if(Array.isArray(rawChord.melody))item.melody=Array.from({length:4},(_,i)=>{
          const note=rawChord.melody[i];
          return Number.isInteger(note)&&note>=60&&note<=82?note:null;
        });
        return [item];
      })};
  }
  try {
    const preset=params.get('progression');
    state=(preset?normalize({tonic:params.get('root')?.replace('#','♯'),mode:params.get('mode'),bpm:params.get('bpm'),
      chords:preset.split(',').map(value=>{const [root,quality,inversion]=value.split(':');return {root:root.replace('#','♯'),quality,inversion};})}):normalize(JSON.parse(localStorage.getItem(storageKey))))||{...defaults};
  } catch {}
  const controls=$('tool-controls'), progression=$('progression'), palette=$('lab-palette');
  const comparison=document.createElement('section');
  comparison.className='lab-comparison';
  comparison.setAttribute('aria-label',t('Sammenlign A og B','Compare A and B'));
  const comparisonActions=document.createElement('div');
  comparisonActions.className='tool-actions';
  const comparisonStatus=document.createElement('p');
  comparisonStatus.setAttribute('role','status');
  const prompt=document.createElement('p');
  prompt.textContent=t('Hva endret seg i klangen eller bassbevegelsen?', 'What changed in the sound or the bass movement?');
  const compare=button(t('Lag variant B','Create variant B'),()=>{
    original=state;
    variant=normalize(state);
    showVersion(variant, versionB);
  });
  const versionA=button(t('A · Original','A · Original'),()=>showVersion(original,versionA));
  const versionB=button(t('B · Variant','B · Variant'),()=>showVersion(variant,versionB));
  const endComparison=button(t('Avslutt sammenligning','End comparison'),()=>{
    state=original;
    original=variant=changedBar=null;
    update();
    status('');
    compare.focus();
  });
  comparisonActions.append(compare,versionA,versionB,endComparison);
  comparison.append(comparisonActions,comparisonStatus,prompt);
  $('tool-actions').after(comparison);
  function showVersion(version,control){
    if(state!==version){
      state=version;
      update();
      status('');
    }
    control.focus();
  }
  function renderComparison(){
    const comparing=original!==null, isVariant=state===variant;
    compare.hidden=comparing;
    compare.disabled=!state.chords.length;
    for(const control of [versionA,versionB,endComparison])control.hidden=!comparing;
    versionA.setAttribute('aria-pressed',String(comparing&&!isVariant));
    versionB.setAttribute('aria-pressed',String(isVariant));
    prompt.hidden=comparisonStatus.hidden=!comparing;
    comparisonStatus.textContent=!comparing?'':isVariant
      ? t('B vises. Endre én akkord og spill begge versjonene. Melodi og tempo er de samme.',
          'Showing B. Change one chord and play both versions. The melody and tempo stay the same.')
      : t('A vises. Spill originalen eller bytt til B.', 'Showing A. Play the original or switch to B.');
    play.textContent=comparing
      ? t('Spill ','Play ')+(isVariant?'B':'A')
      : t('Spill','Play');
  }

  function scaleChords(tones){
    return tones.flatMap((root,index)=>{
      const intervals=[0,2,4].map(step=>model.mod(tones[(index+step)%7].pc-root.pc));
      const quality=Object.keys(model.qualities).find(q=>model.qualities[q][3].join()===intervals.join());
      const name=model.roots.includes(root.name)?root.name:model.roots[root.pc];
      return quality?[{root:name,quality,inversion:0}]:[];
    });
  }
  function appendChord(item,focus=true){
    if(state.chords.length>=24)return;
    state.chords.push({...item});
    update();
    if(focus){
      const editor=progression.lastElementChild?.querySelector('details');
      if(editor){editor.open=true;editor.querySelector('select').focus();}
    }
  }
  const play=button(t('Spill','Play'),playAll);
  const halt=button(t('Stopp','Stop'),()=>stop(true));
  const addChord=button(t('Legg til akkord','Add chord'),()=>{
    appendChord(scaleChords(model.scale(state.tonic,state.mode))[0]);
  });
  const save=button(t('Lagre','Save'),()=>{
    try {
      localStorage.setItem(storageKey,JSON.stringify(state));
      status(t('Komposisjonen er lagret.','Composition saved.'));
    } catch {status(t('Lagring er utilgjengelig.','Storage is unavailable.'));}
  });
  const load=button(t('Hent lagret','Load saved'),()=>{
    try {
      const saved=normalize(JSON.parse(localStorage.getItem(storageKey)));
      if(saved){state=saved;update();status(t('Lagret komposisjon hentet.','Saved composition loaded.'));}
      else status(t('Du har ingen lagret komposisjon.','There is no saved composition.'));
    } catch {status(t('Komposisjonen kunne ikke hentes.','Could not load the composition.'));}
  });
  const clear=button(t('Ny progresjon','New progression'),()=>{
    if(confirm(t('Vil du tømme denne progresjonen?','Clear this progression?'))){
      state={...state,chords:[]};
      update();
    }
  });
  $('tool-actions').append(addChord,play,halt,save,load,clear);
  const tonicInput=select(t('Toneart','Key'),roots,state.tonic,v=>{state.tonic=v;update();});
  const modeInput=select(t('Tonesett','Scale'),modes,state.mode,v=>{state.mode=v;update();});
  const tempo=document.createElement('label'), speed=document.createElement('input');
  tempo.append(t('Tempo (BPM)','Tempo (BPM)'),speed); speed.type='number';speed.min=40;speed.max=220;speed.step=1;
  speed.onchange=()=>{state.bpm=Math.max(40,Math.min(220,Math.round(Number(speed.value)||96)));update();};
  controls.append(tonicInput,modeInput,tempo);
  function render() {
    const comparing=original!==null, isVariant=state===variant;
    renderComparison();
    for(const field of controls.querySelectorAll('select,input'))field.disabled=comparing;
    tonicInput.querySelector('select').value=state.tonic;
    modeInput.querySelector('select').value=state.mode;
    speed.value=state.bpm;
    const tones=model.scale(state.tonic,state.mode);
    $('tone-set').textContent=tones.map(n=>n.name).join(' · ');
    palette.replaceChildren();
    const label=document.createElement('h3');
    label.textContent=t('Akkorder i tonesettet','Chords in this scale');
    palette.append(label);
    const options=document.createElement('div');
    options.className='lab-chord-options';
    for(const item of scaleChords(tones)){
      const chord=model.chord(item.root,item.quality);
      const roman=model.analyze(item,state.tonic,state.mode).roman;
      const add=button(roman+' · '+chord.name,()=>{
        const prior=[...options.children].indexOf(add);
        appendChord(item,false);
        (palette.querySelectorAll('.lab-chord-options button')[prior]?.disabled
          ? progression.lastElementChild?.querySelector('select')
          : palette.querySelectorAll('.lab-chord-options button')[prior])?.focus();
      });
      const degree=document.createElement('span');
      degree.textContent=roman;
      const name=document.createElement('span');
      name.textContent=chord.name;
      add.replaceChildren(degree,name);
      add.setAttribute('aria-label',t('Legg til ','Add ')+chord.name+' ('+roman+')');
      add.disabled=comparing||state.chords.length>=24;
      options.append(add);
    }
    palette.append(options);
    const empty=$('lab-empty');
    empty.hidden=state.chords.length>0;
    empty.replaceChildren(t('Velg en akkord fra paletten eller prøv en firetakters skisse.','Choose a chord from the palette or try a four-bar sketch.'),' ',
      button(t('Prøv en skisse','Try a sketch'),()=>{
        const chords=scaleChords(tones);
        const base=60+ModusScales.parse(state.tonic).pc;
        const melody=[[0,2,4,2],[3,5,3,2],[1,4,6,4],[2,1,0,null]];
        state.chords=[0,3,4,0].map((degree,i)=>({...chords[degree],
          melody:melody[i].map(step=>step==null?null:base+tones[step].offset)}));
        update();play.focus();
      }));
    progression.replaceChildren();
    state.chords.forEach((item,index)=>{
      const card=document.createElement('li'), title=document.createElement('h2'), details=document.createElement('p');
      const chord=model.chord(item.root,item.quality,item.inversion), analysis=model.analyze(item,state.tonic,state.mode);
      title.textContent=chord.name+' · '+analysis.roman;
      details.textContent=chord.order.map(n=>n.name).join(' – ')+(analysis.diatonic?'':' · '+t('Utenfor tonesettet','Outside the scale'));
      const fields=document.createElement('div');fields.className='tool-fields';
      function edit(prop,value) {
        item[prop]=value;
        if(prop==='quality') item.inversion=Math.min(item.inversion,model.qualities[value][3].length-1);
        if(isVariant){
          const reference=original.chords[index];
          changedBar=['root','quality','inversion'].some(key=>item[key]!==reference[key])?index:null;
        }
        const position=[...fields.querySelectorAll('select')].indexOf(document.activeElement);
        update();
        const editor=progression.children[index]?.querySelector('details');
        if(editor){editor.open=true;editor.querySelectorAll('select')[position]?.focus();}
      }
      fields.append(
        select(t('Grunntone','Root'),roots,item.root,v=>edit('root',v)),
        select(t('Akkordtype','Chord quality'),qualities,item.quality,v=>edit('quality',v)),
        select(t('Omvending','Inversion'),chord.tones.map((_,i)=>[String(i),i?String(i):t('Grunnstilling','Root position')]),String(item.inversion),v=>edit('inversion',Number(v)))
      );
      const editable=!comparing||(isVariant&&(changedBar===null||changedBar===index));
      const actions=document.createElement('div'); actions.className='tool-actions';
      function move(delta) {
        const next=index+delta; if(next<0||next>=state.chords.length)return;
        [state.chords[index],state.chords[next]]=[state.chords[next],state.chords[index]];
        update(); progression.children[next].querySelector('summary').focus();
      }
      const earlier=button(t('Tidligere','Earlier'),()=>move(-1)), later=button(t('Senere','Later'),()=>move(1));
      earlier.disabled=index===0; later.disabled=index===state.chords.length-1;
      actions.append(earlier,later,button(t('Fjern','Remove'),()=>{state.chords.splice(index,1);update();(progression.children[Math.min(index,state.chords.length-1)]?.querySelector('summary')||addChord).focus();}));
      const bar=document.createElement('p');
      bar.className='lab-bar-label';
      bar.textContent=t('Takt ','Bar ')+(index+1);
      const melody=document.createElement('fieldset');
      melody.className='lab-melody';
      melody.disabled=comparing;
      const legend=document.createElement('legend');
      legend.textContent=t('Melodi','Melody');
      melody.append(legend);
      const saved=item.melody||[];
      for(let beat=0;beat<4;beat++){
        const melodicNotes=tones.map(note=>[String(60+ModusScales.parse(state.tonic).pc+note.offset),note.name+(chord.tones.some(n=>n.pc===note.pc)?' •':'')]);
        if(saved[beat]!=null&&!melodicNotes.some(([midi])=>Number(midi)===saved[beat])){
          melodicNotes.push([String(saved[beat]),model.roots[saved[beat]%12]]);
        }
        const field=select(String(beat+1),[['',t('Pause','Rest')],...melodicNotes],saved[beat]==null?'':String(saved[beat]),value=>{
          item.melody=Array.from({length:4},(_,i)=>i===beat?(value===''?null:Number(value)):(item.melody?.[i]??null));
          stop(false);
        });
        field.querySelector('select').setAttribute('aria-label',t('Melodi, slag ','Melody, beat ')+(beat+1));
        melody.append(field);
      }
      const editor=document.createElement('details');
      const summary=document.createElement('summary');
      summary.textContent=t('Rediger akkord','Edit chord');
      editor.append(summary,fields);
      card.append(bar,title,details,melody);
      if(editable)card.append(editor);
      if(!comparing)card.append(actions);
      progression.append(card);
    });
    play.disabled=state.chords.length===0; halt.disabled=true;
    addChord.disabled=comparing||state.chords.length>=24;
    save.disabled=load.disabled=clear.disabled=comparing;
  }
  function update(){stop(false);render();}
  function stop(report){
    token++;
    timers.forEach(clearTimeout);timers=[];audio.stop();
    for(const card of progression.children) card.removeAttribute('aria-current');
    halt.disabled=true;play.disabled=!state.chords.length;
    if(report)status(t('Avspilling stoppet.','Playback stopped.'));
  }
  async function playAll(){
    stop(false);const run=token;play.disabled=true;halt.disabled=false;
    try {
      await audio.start();
      const items=await Promise.all(state.chords.map(async item=>({
        harmony:await Promise.all(model.chord(item.root,item.quality,item.inversion).midi.map(audio.sample)),
        melody:await Promise.all((item.melody||[]).map(note=>note==null?null:audio.sample(note)))
      })));
      if(run!==token)return;
      const span=240/state.bpm, start=audio.now()+.075;
      items.forEach(({harmony,melody},i)=>{
        harmony.forEach(sample=>audio.schedule(sample,start+i*span,span*.9,.19/harmony.length));
        melody.forEach((sample,beat)=>{
          if(sample)audio.schedule(sample,start+(i+beat/4)*span,span*.22,.18);
        });
        timers.push(setTimeout(()=>{
          for(const card of progression.children) card.removeAttribute('aria-current');
          progression.children[i]?.setAttribute('aria-current','step');
        },(i*span+.075)*1000));
      });
      status(t('Spiller progresjonen.','Playing the progression.'));
      timers.push(setTimeout(()=>{stop(false);status(t('Avspilling ferdig.','Playback finished.'));},(items.length*span+.075)*1000));
    } catch {if(run===token){stop(false);status(t('Lyden kunne ikke lastes.','Audio could not load.'));}}
  }
  window.addEventListener('pagehide',()=>stop(false));
  render();
})();
