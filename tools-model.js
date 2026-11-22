(function (root) {
  'use strict';
  const scales = root.ModusScales;
  const roots = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B','D♭','G♭','D♯','G♯','A♯','E♯'];
  const modes = [
    ['ionian','Ionisk','Ionian'], ['dorian','Dorisk','Dorian'], ['phrygian','Frygisk','Phrygian'],
    ['lydian','Lydisk','Lydian'], ['mixolydian','Miksolydisk','Mixolydian'], ['aeolian','Eolisk','Aeolian'],
    ['locrian','Lokrisk','Locrian'], ['major','Dur','Major'], ['naturalMinor','Naturlig moll','Natural minor'],
    ['harmonicMinor','Harmonisk moll','Harmonic minor'], ['melodicMinor','Melodisk moll (stigende)','Melodic minor (ascending)']
  ];
  const qualities = {
    maj:['','Dur','Major',[0,4,7],['1','3','5']], min:['m','Moll','Minor',[0,3,7],['1','♭3','5']],
    dim:['dim','Forminsket','Diminished',[0,3,6],['1','♭3','♭5']], aug:['aug','Forstørret','Augmented',[0,4,8],['1','3','♯5']],
    dom7:['7','Dominantseptim','Dominant seventh',[0,4,7,10],['1','3','5','♭7']],
    maj7:['maj7','Durseptim','Major seventh',[0,4,7,11],['1','3','5','7']],
    min7:['m7','Mollseptim','Minor seventh',[0,3,7,10],['1','♭3','5','♭7']],
    halfdim:['m7♭5','Halvforminsket','Half diminished',[0,3,6,10],['1','♭3','♭5','♭7']],
    dim7:['dim7','Forminsket septim','Diminished seventh',[0,3,6,9],['1','♭3','♭5','♭♭7']],
    minmaj7:['m(maj7)','Moll med stor septim','Minor major seventh',[0,3,7,11],['1','♭3','5','7']]
  };
  const shared = scales.create(root.ModusTheoryData);
  const mod = n => (n % 12 + 12) % 12;
  function named(tonic, intervals, degrees, labels, marks) {
    const {pc} = scales.parse(tonic);
    return intervals.map((offset,i) => ({
      pc:mod(pc+offset), offset, step:degrees[i]+1, degree:labels[i], root:i===0,
      character:marks.includes(i), name:scales.spell(tonic,pc,offset,degrees[i]).replace('♭♭','𝄫')
    }));
  }
  function scale(tonic,mode) {
    if (mode === 'harmonicMinor' || mode === 'melodicMinor') {
      const six = mode === 'harmonicMinor' ? 8 : 9;
      return named(tonic,[0,2,3,5,7,six,11],[0,1,2,3,4,5,6],['1','2','♭3','4','5',six===8?'♭6':'6','7'],[5,6]);
    }
    const {pc}=scales.parse(tonic);
    return shared.scale(tonic,mode).map((note,i)=>({...note,step:i+1,offset:mod(note.pc-pc)}));
  }
  function chord(tonic,quality,inversion=0) {
    const [suffix,,,intervals,labels]=qualities[quality];
    const tones=named(tonic,intervals,intervals.map((_,i)=>2*i),labels,intervals.map((_,i)=>i).filter(i=>i>0&&i!==2));
    const midi=tones.map(t=>48+scales.parse(tonic).pc+t.offset);
    const order=[...tones.slice(inversion),...tones.slice(0,inversion)];
    return {tones, order, midi:[...midi.slice(inversion),...midi.slice(0,inversion).map(n=>n+12)],
      name:tonic+suffix+(inversion?'/'+tones[inversion].name:'')};
  }
  function normalizeChord(raw) {
    if (!raw || !roots.includes(raw.root) || !Object.hasOwn(qualities,raw.quality)) return null;
    const inversion=Number(raw.inversion || 0);
    return Number.isInteger(inversion)&&inversion>=0&&inversion<qualities[raw.quality][3].length
      ? {root:raw.root,quality:raw.quality,inversion} : null;
  }
  function analyze(item,tonic,mode) {
    const tones=scale(tonic,mode), current=chord(item.root,item.quality), index=tones.findIndex(t=>t.pc===current.tones[0].pc);
    const diatonic=current.tones.every(n=>tones.some(t=>t.pc===n.pc));
    if (index<0) return {roman:'—',diatonic:false};
    const roman=['I','II','III','IV','V','VI','VII'][index];
    const [, , , intervals]=qualities[item.quality];
    return {roman:(intervals[1]===3?roman.toLowerCase():roman)+({dim:'°',aug:'+',dim7:'°7',halfdim:'ø7',maj7:'maj7',minmaj7:'(maj7)'}[item.quality]||(intervals.length===4?'7':'')),diatonic};
  }
  root.ModusTools={roots,modes,qualities,mod,scale,chord,analyze,normalizeChord,open:scales.open};
})(globalThis);
