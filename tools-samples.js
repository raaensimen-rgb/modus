/* MODUS grand piano samples, with the existing Modusharmoni nearest-sample mapping. */
(function (root) {
  'use strict';
  let context, output;
  const cache = new Map();
  const active = new Set();
  async function start() {
    if (!context) {
      context = new (window.AudioContext || window.webkitAudioContext)();
      output = context.createDynamicsCompressor();
      output.connect(context.destination);
    }
    await context.resume();
  }
  async function sample(midi) {
    const nearest=Math.max(48,Math.min(84,48+Math.round((midi-48)/3)*3));
    if (!cache.has(nearest)) {
      cache.set(nearest,fetch('/audio/grand-'+nearest+'.mp3').then(response=>{
        if (!response.ok) throw Error('Piano sample unavailable');
        return response.arrayBuffer();
      }).then(bytes=>context.decodeAudioData(bytes)).catch(error=>{
        cache.delete(nearest);
        throw error;
      }));
    }
    return {buffer:await cache.get(nearest), rate:2**((midi-nearest)/12)};
  }
  function schedule({buffer,rate}, when, duration, volume) {
    const source=context.createBufferSource(), gain=context.createGain();
    source.buffer=buffer; source.playbackRate.value=rate;
    gain.gain.setValueAtTime(volume,when);
    gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    source.connect(gain); gain.connect(output);
    active.add(source);
    source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();};
    source.start(when);source.stop(when+duration+.01);
  }
  function stop() {
    for(const source of active) source.stop();
    active.clear();
  }
  root.ModusToolSamples={start,sample,schedule,stop,now:()=>context.currentTime};
})(globalThis);
