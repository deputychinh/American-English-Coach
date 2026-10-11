export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function ipaMarkup(value, focus = '') {
  const aliases = {'iː':['iː','i'], 'uː':['uː','u'], l:['l','ɫ']};
  const targets = aliases[focus] || (focus ? [focus] : []);
  let result = '';
  for (let i = 0; i < value.length;) {
    const match = targets.find(target => value.startsWith(target, i));
    if (match) {
      result += `<mark class="ipa-focus">${escapeHtml(match)}</mark>`;
      i += match.length;
    } else {
      result += escapeHtml(value[i++]);
    }
  }
  return `<span class="ipa" lang="en">/${result}/</span>`;
}

const partsOfSpeech = {n:'danh từ', v:'động từ', adj:'tính từ', adv:'trạng từ',
  prep:'giới từ', conj:'liên từ', pron:'đại từ', det:'từ hạn định',
  intj:'thán từ', abbr:'viết tắt', phr:'cụm từ'};

export function meaningsMarkup(definitions) {
  if (!definitions.length) return '<p class="meaning-missing">Chưa có nghĩa Việt trong nguồn offline.</p>';
  const senses = definitions.flatMap(d => d.senses.map(sense => ({...d, sense})));
  const render = item => `<div class="definition"><span class="definition-pos">${item.inflected?'Dạng của '+escapeHtml(item.headword)+' · ':''}${escapeHtml(partsOfSpeech[item.pos] || item.pos)}</span><p class="translation">${escapeHtml(item.sense)}</p><span class="definition-source">${item.source==='lesson'?'Từ bài học':item.reviewed?'thichhoc · đã kiểm duyệt':'thichhoc · dịch máy, chưa kiểm duyệt'}</span></div>`;
  return render(senses[0]) + (senses.length > 1 ? `<details class="more-meanings"><summary>Xem ${senses.length-1} nghĩa khác</summary>${senses.slice(1).map(render).join('')}</details>` : '');
}
