import {expect} from 'chai';
import {renderWikiPage, wikiExcerpt, wikiSection} from '@/client/wrybit/create/wikiContent';

describe('source creation wiki content', () => {
  it('keeps readable sections and local anchors while dropping active content and disguised script URLs', () => {
    const markdown = '# Rules\n\n## Details\n\nThis paragraph explains the visible option without changing the game configuration.\n\n' +
      '<script>alert(1)</script><iframe src="https://example.org"></iframe><form><input></form>' +
      '<a href="java&#x09;script:alert(1)" onclick="alert(2)">Bad</a>' +
      '<img src="data:text/html,boom" onerror="alert(3)"><a href="#details">Details</a>';
    expect(wikiExcerpt(wikiSection(markdown, 'details'))).eq('This paragraph explains the visible option without changing the game configuration.');
    const page = renderWikiPage(markdown);
    expect(page.title).eq('Rules');
    const root = document.createElement('div');
    root.innerHTML = page.html;
    expect(root.querySelector('script, iframe, form, input, [onclick], [onerror]')).eq(null);
    expect(root.querySelector('h2')?.id).eq('wiki-details');
    expect(root.querySelector('a')?.getAttribute('href')).not.contains('script:');
    expect(root.querySelector('img')?.getAttribute('src')).not.contains('data:');
    expect(root.querySelector('a[href="#wiki-details"]')).not.eq(null);
  });
});
