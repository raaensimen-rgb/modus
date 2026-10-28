export const IDS = ["toner-og-intervaller", "dur-og-moll", "kvintsirkelen", "din-forste-improvisasjon", "moduser-og-tonalt-sentrum", "ii-v-i-kadensen", "septimakkorder", "harmonisk-moll-og-frygisk-dominant", "stemmeforing", "rytme-i-sju-aatte", "bygg-akkorder-i-en-toneart", "ett-skalakart-nye-maltoner", "dorisk-og-eolisk"];
if(typeof window!=='undefined') IDS.push(...(window.MODUS_CMS_IDS||[]).filter(id=>!IDS.includes(id)));
export function localProgress(storage, userId = null) {
  const prefix = userId ? `modus.account.progress.v1.${userId}.` : 'modus.article-quiz.v1.';
  const memory = new Set();
  return {
    has(id) { if (!IDS.includes(id)) return false; try { return storage?.getItem(prefix+id) === 'passed' || memory.has(id); } catch { return memory.has(id); } },
    pass(id) { if (!IDS.includes(id)) return false; memory.add(id); try { if (!storage) return false; storage.setItem(prefix+id,'passed'); return true; } catch { return false; } },
    list() { return IDS.filter(id=>this.has(id)); }
  };
}
