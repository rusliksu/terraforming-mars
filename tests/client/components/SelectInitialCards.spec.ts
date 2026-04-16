import {mount, VueWrapper} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import SelectInitialCards from '@/client/components/SelectInitialCards.vue';
import {SelectInitialCardsResponse, InputResponse} from '@/common/inputs/InputResponse';
import ConfirmDialog from '@/client/components/common/ConfirmDialog.vue';
import {Preferences} from '@/client/utils/PreferencesManager';
import * as titles from '@/common/inputs/SelectInitialCards';
import {SelectCardModel} from '@/common/models/PlayerInputModel';
import {CardModel} from '@/common/models/CardModel';

let savedData: InputResponse | undefined;

describe('SelectInitialCards', () => {
  beforeEach(() => {
    savedData = undefined;
  });

  it('saves data without prelude', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS]);
    expect(component).not.is.undefined;

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(2);
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);

    await component.vm.$nextTick();
    expect(button.attributes().disabled).is.undefined;

    selectCards[1].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    await button.trigger('click');

    expect(savedData).to.deep.eq({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.ECOLINE]},
      {type: 'card', cards: [CardName.ANTS]},
    ]});
  });

  it('Cannot save with only one prelude', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS], [CardName.ALLIED_BANK]);
    expect(component).not.is.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(3);
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK]);
    selectCards[2].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;
  });

  it('saves data with prelude', async () => {
    const component = createComponent(
      [CardName.ECOLINE],
      [CardName.ANTS],
      [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);
    expect(component).not.is.undefined;

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(3);

    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    await component.vm.$nextTick();
    expect(button.attributes().disabled).not.to.be.undefined;

    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);

    await component.vm.$nextTick();
    expect(button.attributes().disabled).is.undefined;

    selectCards[2].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    await button.trigger('click');

    expect(savedData).to.deep.eq({type: 'initialCards', responses: [
      {type: 'card', cards: [CardName.ECOLINE]},
      {type: 'card', cards: [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]},
      {type: 'card', cards: [CardName.ANTS]},
    ]});

    await component.vm.$nextTick();
    const confirmationDialog = component.vm.$refs.confirmation as InstanceType<typeof ConfirmDialog>;
    expect(confirmationDialog.$data.shown).is.false;
  });

  it('shows error when no project cards selected', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS]);
    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    await component.vm.$nextTick();

    const button = getButton(component);
    await button.trigger('click');

    expect(savedData).is.undefined;

    await component.vm.$nextTick();
    const confirmationDialog = getConfirmDialog(component);
    expect(confirmationDialog.$data.shown).is.true;
  });

  it('shows error when prelude cards are selected but not project cards', async () => {
    const component = createComponent(
      [CardName.ECOLINE],
      [CardName.ANTS],
      [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);

    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.ALLIED_BANK, CardName.SUPPLY_DROP]);
    await component.vm.$nextTick();
    const button = getButton(component);
    await button.trigger('click');
    expect(savedData).is.undefined;

    await component.vm.$nextTick();
    const confirmationDialog = getConfirmDialog(component);
    expect(confirmationDialog.$data.shown).is.true;
  });

  it('Cannot select two ceos', async () => {
    const component = createComponent([CardName.ECOLINE], [CardName.ANTS], undefined, [CardName.FLOYD, CardName.HAL9000, CardName.ENDER]);
    expect(component).not.is.undefined;

    const selectCards = component.findAllComponents({name: 'select-card'});
    expect(selectCards).has.length(3);
    selectCards[0].vm.$emit('cardschanged', [CardName.ECOLINE]);
    selectCards[1].vm.$emit('cardschanged', [CardName.FLOYD, CardName.HAL9000]);
    selectCards[2].vm.$emit('cardschanged', [CardName.ANTS]);
    await component.vm.$nextTick();

    const button = getButton(component);
    expect(button.attributes().disabled).not.to.be.undefined;
  });

  it('recalculates project costs from selected corporation and preludes', async () => {
    const component = createComponent(
      [CardName.TERACTOR],
      [CardName.EARTH_CATAPULT, CardName.RESEARCH_OUTPOST],
      [CardName.VALLEY_TRUST, CardName.ALLIED_BANK],
    );

    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.TERACTOR]);
    selectCards[1].vm.$emit('cardschanged', [CardName.VALLEY_TRUST, CardName.ALLIED_BANK]);
    await component.vm.$nextTick();

    const projectCards = getRenderedProjectCards(component);
    expect(projectCards.find((card) => card.name === CardName.EARTH_CATAPULT)?.calculatedCost).eq(20);
    expect(projectCards.find((card) => card.name === CardName.RESEARCH_OUTPOST)?.calculatedCost).eq(16);
  });

  it('recalculates Mars Direct discounts from currently selected Mars tags', async () => {
    const component = createComponent(
      [CardName.MARS_DIRECT],
      [CardName.DUST_STORM],
      [CardName.DESIGN_COMPANY, CardName.ALLIED_BANK],
    );

    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.MARS_DIRECT]);
    selectCards[1].vm.$emit('cardschanged', [CardName.DESIGN_COMPANY, CardName.ALLIED_BANK]);
    await component.vm.$nextTick();

    const dustStorm = getRenderedProjectCards(component).find((card) => card.name === CardName.DUST_STORM);
    expect(dustStorm?.calculatedCost).eq(15);
  });

  it('recalculates Crescent Research Association discounts from Moon tags', async () => {
    const component = createComponent(
      [CardName.CRESCENT_RESEARCH_ASSOCIATION],
      [CardName.LUNAR_SECURITY_STATIONS],
    );

    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.CRESCENT_RESEARCH_ASSOCIATION]);
    await component.vm.$nextTick();

    const lunarStations = getRenderedProjectCards(component).find((card) => card.name === CardName.LUNAR_SECURITY_STATIONS);
    // Lunar Security Stations: cost 9, Moon:1. Crescent Moon:1. Discount = 1*1.
    expect(lunarStations?.calculatedCost).eq(8);
  });

  it('does not discount projects without matching tags', async () => {
    const component = createComponent(
      [CardName.TERACTOR],
      [CardName.ANTS],
    );

    const selectCards = component.findAllComponents({name: 'select-card'});
    selectCards[0].vm.$emit('cardschanged', [CardName.TERACTOR]);
    await component.vm.$nextTick();

    const ants = getRenderedProjectCards(component).find((card) => card.name === CardName.ANTS);
    // Ants: cost 9, no Earth tag. Teractor Earth discount irrelevant. Expect baseCost.
    expect(ants?.calculatedCost).eq(9);
  });

  it('keeps base cost when no corporation is selected', async () => {
    const component = createComponent(
      [CardName.TERACTOR],
      [CardName.EARTH_CATAPULT],
    );

    // Never emit cardschanged for corp: selectedCorporations stays empty.
    const projectCards = getRenderedProjectCards(component);
    const earthCatapult = projectCards.find((card) => card.name === CardName.EARTH_CATAPULT);
    // Earth Catapult: cost 23. No corp selected → no discounts.
    expect(earthCatapult?.calculatedCost).eq(23);
  });
});

function getRenderedProjectCards(component: VueWrapper<InstanceType<typeof SelectInitialCards>>): Array<CardModel> {
  const selectCards = component.findAllComponents({name: 'select-card'});
  const projectSelectCard = selectCards[selectCards.length - 1];
  const input = projectSelectCard.props('playerinput') as SelectCardModel;
  return input.cards;
}

function getButton(component: VueWrapper<InstanceType<typeof SelectInitialCards>>) {
  return component.findAllComponents({name: 'AppButton'})[0];
}

function getConfirmDialog(component: VueWrapper<InstanceType<typeof SelectInitialCards>>): InstanceType<typeof ConfirmDialog> {
  return component.vm.$refs.confirmation as InstanceType<typeof ConfirmDialog>;
}

function createComponent(corpCards: Array<CardName>, projectCards: Array<CardName>, preludeCards?: Array<CardName>, ceoCards?: Array<CardName>) {
  const toObject = (cards: Array<CardName>) => cards.map((name) => {
    return {name} as CardModel;
  });
  const options: Array<SelectCardModel> = [{
    type: 'card',
    title: titles.SELECT_CORPORATION_TITLE,
    buttonLabel: 'x',
    cards: toObject(corpCards),
    max: 1,
    min: 1,
    showOnlyInLearnerMode: false,
    selectBlueCardAction: false,
    showOwner: false,
  }, {
    type: 'card',
    title: titles.SELECT_PROJECTS_TITLE,
    buttonLabel: 'x',
    cards: toObject(projectCards),
    max: projectCards.length,
    min: 1,
    showOnlyInLearnerMode: false,
    selectBlueCardAction: false,
    showOwner: false,
  }];

  if (preludeCards) {
    options.splice(1, 0, {
      type: 'card',
      title: titles.SELECT_PRELUDE_TITLE,
      buttonLabel: 'x',
      cards: toObject(preludeCards),
      max: 2,
      min: 2,
      showOnlyInLearnerMode: false,
      selectBlueCardAction: false,
      showOwner: false,
    });
  }
  if (ceoCards) {
    options.push({
      type: 'card',
      title: titles.SELECT_CEO_TITLE,
      buttonLabel: 'x',
      cards: toObject(ceoCards),
      max: 1,
      min: 1,
      showOnlyInLearnerMode: false,
      selectBlueCardAction: false,
      showOwner: false,
    });
  }

  return mount(SelectInitialCards, {
    ...globalConfig,
    props: {
      playerView: {
        id: 'foo',
        dealtCorporationCards: [],
        thisPlayer: {actionsThisGeneration: []},
        game: {},
      },
      playerinput: {
        title: 'selectInitialCards',
        options,
      },
      onsave: function(data: SelectInitialCardsResponse) {
        savedData = data;
      },
      showsave: true,
      preferences: {
        show_alerts: true,
      } as Readonly<Preferences>,
    },
  });
}
