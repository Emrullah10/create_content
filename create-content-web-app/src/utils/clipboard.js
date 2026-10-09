// Panoya kopyalama. SENKRON yol (gizli textarea + execCommand) once denenir: tiklama aninda, sayfa henuz odaktayken calisir.
// navigator.clipboard yalniz guvenli baglamda (https/localhost) vardir ve sayfa odagini kaybedince (orn. window.open sonrasi)
// "Document is not focused" ile reddeder; bu yuzden yalniz yedek olarak kullanilir. Donus: Promise<boolean>.
export const copySync = (text, doc = globalThis.document) => {
  if (!doc?.body) return false;
  const area = doc.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  doc.body.appendChild(area);
  area.select();
  try {
    return doc.execCommand?.('copy') === true;
  } catch {
    return false;
  } finally {
    doc.body.removeChild(area);
  }
};

export const copyText = async (text, { doc = globalThis.document, clipboard = globalThis.navigator?.clipboard } = {}) => {
  if (!text) return false;
  if (copySync(text, doc)) return true;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
