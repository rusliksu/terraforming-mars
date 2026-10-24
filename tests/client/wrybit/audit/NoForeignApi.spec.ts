import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {expect} from 'chai';

const ROOT = join(process.cwd(), 'src', 'client', 'wrybit');
const EXTENSIONS = /.(ts|vue)$/;

function sourceFiles(dir: string): Array<string> {
  const files: Array<string> = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (EXTENSIONS.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

describe('Wrybit foreign API/AI audit', () => {
  it('does not fetch external APIs or use AI/network transports', () => {
    const forbidden = [
      /fetch\s*\(\s*['"`]https?:\/\//i,
      /raw\.githubusercontent\.com/i,
      /\b(openai|anthropic|generativelanguage|huggingface|replicate|cohere|mistral)\b/i,
      /new\s+WebSocket\b/,
      /new\s+EventSource\b/,
      /sendBeacon\s*\(/,
      /XMLHttpRequest\b/,
    ];
    const hits: Array<string> = [];
    for (const file of sourceFiles(ROOT)) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        if (pattern.test(text)) {
          hits.push(relative(ROOT, file) + ' -> ' + pattern);
        }
      }
    }
    expect(hits).deep.eq([]);
  });
});
