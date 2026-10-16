import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ipaMarkup, meaningsMarkup} from '../static/lexicon-view.mjs';

test('IPA retains stress and highlights the selected sound', () => {
  assert.match(ipaMarkup('əˈbaʊt', 'aʊ'), /əˈb<mark class="ipa-focus">aʊ<\/mark>t/);
  assert.match(ipaMarkup('ˈsit', 'iː'), /<mark class="ipa-focus">i<\/mark>/);
  assert.match(ipaMarkup('ˈɫaɪt', 'l'), /<mark class="ipa-focus">ɫ<\/mark>/);
});
test('dictionary content is escaped before rendering HTML', () => {
  const html = meaningsMarkup([{headword:'<img>', pos:'n', source:'thichhoc',
    reviewed:false, inflected:true, senses:['<script>alert(1)</script>', 'nghĩa thứ hai']}]);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img>'));
  assert.match(html, /dịch máy, chưa kiểm duyệt/);
  assert.match(html, /Dạng của/);
  assert.match(html, /<details/);
  assert.match(meaningsMarkup([]), /Chưa có nghĩa Việt/);
});
