import {expect} from 'chai';
import {consumeLoginReturnTo} from '@/client/utils/loginRedirect';

describe('loginRedirect', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('consumes a safe same-origin return path once', () => {
    window.sessionStorage.setItem('tm_login_return_to', '/player?id=p123');
    expect(consumeLoginReturnTo()).eq('/player?id=p123');
    expect(consumeLoginReturnTo()).undefined;
  });

  it('rejects protocol-relative return paths', () => {
    window.sessionStorage.setItem('tm_login_return_to', '//evil.example/path');
    expect(consumeLoginReturnTo()).undefined;
    expect(window.sessionStorage.getItem('tm_login_return_to')).eq(null);
  });
});
