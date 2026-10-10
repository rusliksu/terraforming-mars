import {expect} from 'chai';
import {ALL_MODULE_MANIFESTS} from '../../../src/server/cards/AllManifests';
import {floaterCards} from '../../../src/server/cards/venusNext/floaterCards';
import {CardName} from '../../../src/common/cards/CardName';
import {CardResource} from '../../../src/common/CardResource';
import {CardManifest} from '../../../src/server/cards/ModuleManifest';
import {CardType} from '../../../src/common/cards/CardType';

describe('floaterCards', () => {
  it('classifies non-storage floater cards by static names or explicit declarations', () => {
    const found: Array<CardName> = [];
    const classified = new Set(floaterCards);
    ALL_MODULE_MANIFESTS.forEach((manifest) => {
      CardManifest.entries(manifest.projectCards).forEach((entry) => {
        const factory = entry[1];
        const card = new factory!.Factory();

        if (card.resourceType === CardResource.FLOATER) {
          return;
        }
        if (card.type === CardType.PROXY) {
          return;
        }

        if (card.hasFloaterIcon === true) {
          classified.add(card.name);
        }

        const mentionsFloaters = JSON.stringify(card.metadata.renderData)?.toLowerCase().includes('floater');
        if (mentionsFloaters || card.requirements?.some((req) => req.floaters !== undefined)) {
          found.push(card.name);
        }
      });
    });
    expect(Array.from(classified)).to.have.members(found);
  });
});
