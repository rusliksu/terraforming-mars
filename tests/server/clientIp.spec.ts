import {expect} from 'chai';
import {getClientIp} from '../../src/server/server/clientIp';
import {MockRequest} from '../routes/HttpMocks';

describe('clientIp', () => {
  it('prefers CF-Connecting-IP', () => {
    const req = new MockRequest();
    req.headers['cf-connecting-ip'] = '203.0.113.10';
    req.headers['x-forwarded-for'] = '198.51.100.2, 198.51.100.3';
    req.socket.remoteAddress = '127.0.0.1';

    expect(getClientIp(req)).deep.eq({
      address: '203.0.113.10',
      source: 'cf-connecting-ip',
    });
  });

  it('uses True-Client-IP when Cloudflare connecting header is absent', () => {
    const req = new MockRequest();
    req.headers['true-client-ip'] = '203.0.113.11';
    req.headers['x-forwarded-for'] = '198.51.100.2';
    req.socket.remoteAddress = '127.0.0.1';

    expect(getClientIp(req)).deep.eq({
      address: '203.0.113.11',
      source: 'true-client-ip',
    });
  });

  it('uses first X-Forwarded-For entry when Cloudflare headers are absent', () => {
    const req = new MockRequest();
    req.headers['x-forwarded-for'] = '198.51.100.2, 198.51.100.3';
    req.socket.remoteAddress = '127.0.0.1';

    expect(getClientIp(req)).deep.eq({
      address: '198.51.100.2',
      source: 'x-forwarded-for',
    });
  });

  it('falls back to socket.remoteAddress', () => {
    const req = new MockRequest();
    req.socket.remoteAddress = '192.0.2.55';

    expect(getClientIp(req)).deep.eq({
      address: '192.0.2.55',
      source: 'socket.remoteAddress',
    });
  });

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    const req = new MockRequest();
    req.socket.remoteAddress = '::ffff:192.0.2.44';

    expect(getClientIp(req)).deep.eq({
      address: '192.0.2.44',
      source: 'socket.remoteAddress',
    });
  });

  it('ignores invalid header values and falls back', () => {
    const req = new MockRequest();
    req.headers['cf-connecting-ip'] = 'not an ip';
    req.headers['x-forwarded-for'] = 'also not an ip';
    req.socket.remoteAddress = '192.0.2.56';

    expect(getClientIp(req)).deep.eq({
      address: '192.0.2.56',
      source: 'socket.remoteAddress',
    });
  });
});
