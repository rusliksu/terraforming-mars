import {expect} from 'chai';
import {
  CLASSIC_VIEWPORT,
  DEVICE_VIEWPORT,
  enforceClassicViewport,
  releaseDeviceViewport,
  requestDeviceViewport,
  resetViewportForTest,
} from '@/client/utils/viewport';

describe('viewport controller', () => {
  let meta: HTMLMetaElement;
  let createdHere = false;
  let previousContent: string | null = null;

  beforeEach(() => {
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (existing === null) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.append(meta);
      createdHere = true;
    } else {
      meta = existing;
      createdHere = false;
    }
    previousContent = meta.getAttribute('content');
    meta.setAttribute('content', CLASSIC_VIEWPORT);
    resetViewportForTest();
  });

  afterEach(() => {
    resetViewportForTest();
    if (createdHere) {
      meta.remove();
    } else if (previousContent === null) {
      meta.removeAttribute('content');
    } else {
      meta.setAttribute('content', previousContent);
    }
  });

  function content(): string | null {
    return meta.getAttribute('content');
  }

  it('lends the device width to a responsive surface and gives the classic canvas back', () => {
    requestDeviceViewport('start-screen');
    expect(content()).eq(DEVICE_VIEWPORT);

    releaseDeviceViewport('start-screen');
    expect(content()).eq(CLASSIC_VIEWPORT);
  });

  it('keeps the device width until every owner releases it', () => {
    requestDeviceViewport('start-screen');
    requestDeviceViewport('wrybit-shell');
    expect(content()).eq(DEVICE_VIEWPORT);

    releaseDeviceViewport('start-screen');
    expect(content()).eq(DEVICE_VIEWPORT);

    releaseDeviceViewport('wrybit-shell');
    expect(content()).eq(CLASSIC_VIEWPORT);
  });

  it('counts a repeated request from one owner once', () => {
    requestDeviceViewport('wrybit-shell');
    requestDeviceViewport('wrybit-shell');
    releaseDeviceViewport('wrybit-shell');

    expect(content()).eq(CLASSIC_VIEWPORT);
  });

  it('ignores a release from an owner that never asked', () => {
    requestDeviceViewport('wrybit-shell');
    releaseDeviceViewport('start-screen');

    expect(content()).eq(DEVICE_VIEWPORT);
  });

  it('puts the classic viewport back on a classic screen, even after a stray device width', () => {
    meta.setAttribute('content', DEVICE_VIEWPORT);

    enforceClassicViewport();

    expect(content()).eq(CLASSIC_VIEWPORT);
  });

  it('never overrides a responsive surface that currently owns the tag', () => {
    requestDeviceViewport('wrybit-shell');

    enforceClassicViewport();

    expect(content()).eq(DEVICE_VIEWPORT);
  });

  it('restores the content it found rather than assuming the default', () => {
    meta.setAttribute('content', 'width=900');
    resetViewportForTest();

    requestDeviceViewport('create-game-form');
    releaseDeviceViewport('create-game-form');

    expect(content()).eq('width=900');
  });
});
