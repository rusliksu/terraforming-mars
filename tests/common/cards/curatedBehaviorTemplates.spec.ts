import {expect} from 'chai';
import {isCuratedBehavior} from '../../../src/common/cards/curatedBehaviorTemplates';

describe('isCuratedBehavior', () => {
  it('accepts a stock gain', () => {
    expect(isCuratedBehavior({stock: {steel: 5}})).is.true;
  });

  it('accepts a production gain and loss combined', () => {
    expect(isCuratedBehavior({production: {megacredits: 2, heat: -1}})).is.true;
  });

  it('accepts standardResource', () => {
    expect(isCuratedBehavior({standardResource: 2})).is.true;
  });

  it('accepts drawCard as a plain positive count', () => {
    expect(isCuratedBehavior({drawCard: 3})).is.true;
  });

  it('rejects a non-positive drawCard', () => {
    expect(isCuratedBehavior({drawCard: 0})).is.false;
    expect(isCuratedBehavior({drawCard: -1})).is.false;
  });

  it('rejects the rich DrawCard object form (admin-only)', () => {
    expect(isCuratedBehavior({drawCard: {count: 3, keep: 1}})).is.false;
  });

  it('accepts a legal global parameter step', () => {
    expect(isCuratedBehavior({global: {temperature: 2}})).is.true;
    expect(isCuratedBehavior({global: {oxygen: 1, venus: -1}})).is.true;
  });

  it('rejects an illegal global parameter step', () => {
    expect(isCuratedBehavior({global: {temperature: 5}})).is.false;
    expect(isCuratedBehavior({global: {oxygen: 0}})).is.false;
  });

  it('accepts a bare tile placement', () => {
    expect(isCuratedBehavior({greenery: {}})).is.true;
    expect(isCuratedBehavior({city: {on: 'land'}})).is.true;
  });

  it('rejects an invalid placement type', () => {
    expect(isCuratedBehavior({city: {on: 'volcanic'}})).is.false;
  });

  it('accepts addResources as a plain positive count', () => {
    expect(isCuratedBehavior({addResources: 1})).is.true;
  });

  it('rejects unknown top-level keys (admin-only surface)', () => {
    expect(isCuratedBehavior({or: {behaviors: []}})).is.false;
    expect(isCuratedBehavior({spend: {megacredits: 5}})).is.false;
    expect(isCuratedBehavior({moon: {habitatRate: 1}})).is.false;
  });

  it('rejects an empty object', () => {
    expect(isCuratedBehavior({})).is.false;
  });

  it('rejects a non-integer resource amount', () => {
    expect(isCuratedBehavior({stock: {steel: 1.5}})).is.false;
  });

  it('rejects an unknown resource key inside stock/production', () => {
    expect(isCuratedBehavior({stock: {corruption: 1}})).is.false;
  });

  it('rejects non-object input', () => {
    expect(isCuratedBehavior(null as any)).is.false;
    expect(isCuratedBehavior([1, 2] as any)).is.false;
  });
});
