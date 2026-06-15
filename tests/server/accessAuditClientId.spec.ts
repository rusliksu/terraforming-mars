import {expect} from 'chai';
import {ACCESS_AUDIT_CLIENT_COOKIE, getOrSetAccessAuditClientId} from '../../src/server/server/accessAuditClientId';
import {MockRequest, MockResponse} from '../routes/HttpMocks';

describe('accessAuditClientId', () => {
  it('reuses an existing valid audit client cookie', () => {
    const req = new MockRequest();
    const res = new MockResponse();
    req.headers.cookie = `${ACCESS_AUDIT_CLIENT_COOKIE}=existing_client_123456`;

    const clientId = getOrSetAccessAuditClientId(req, res);

    expect(clientId).eq('existing_client_123456');
    expect(res.getHeader('Set-Cookie')).eq(undefined);
  });

  it('sets a new audit client cookie when missing', () => {
    const req = new MockRequest();
    const res = new MockResponse();

    const clientId = getOrSetAccessAuditClientId(req, res);

    expect(clientId).matches(/^[A-Za-z0-9_-]{16,96}$/);
    const header = res.getHeader('Set-Cookie');
    expect(header).to.be.a('string');
    expect(String(header)).contains(`${ACCESS_AUDIT_CLIENT_COOKIE}=`);
    expect(String(header)).contains('HttpOnly');
    expect(String(header)).contains('SameSite=Lax');
  });

  it('appends its cookie without replacing existing Set-Cookie headers', () => {
    const req = new MockRequest();
    const res = new MockResponse();
    res.setHeader('Set-Cookie', 'session=value; Path=/');

    getOrSetAccessAuditClientId(req, res);

    expect(res.getHeader('Set-Cookie')).to.be.an('array').with.length(2);
  });
});
