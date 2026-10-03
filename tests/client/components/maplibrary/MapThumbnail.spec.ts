import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import MapThumbnail from '@/client/components/maplibrary/MapThumbnail.vue';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {BoardName} from '@/common/boards/BoardName';
import {OFFICIAL_MAP_LIBRARY_BOARDS} from '@/common/boards/officialMapLibrary';
import {decodeCustomBoard} from '@/common/boards/customBoardCodec';

describe('MapThumbnail', () => {
  it('renders one hex per space', () => {
    const definition = blankCustomBoard(3, 'Tiny');
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    expect(wrapper.findAll('.map-thumbnail-hex').length).eq(definition.spaces.length);
  });

  it('does not throw for a board with no spaces', () => {
    const definition = {...blankCustomBoard(3, 'Empty'), spaces: []};
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    expect(wrapper.findAll('.map-thumbnail-hex').length).eq(0);
  });

  it('renders a bonus icon for each placement bonus on a space', () => {
    const definition = blankCustomBoard(3, 'Bonuses');
    definition.spaces[0].bonus = [SpaceBonus.PLANT, SpaceBonus.STEEL];
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    expect(wrapper.findAll('.map-thumbnail-hex-bonus').length).eq(2);
    expect(wrapper.find('.board-space-bonus--plant').exists()).is.true;
    expect(wrapper.find('.board-space-bonus--steel').exists()).is.true;
  });

  it('renders the double-wide ocean bonus icon (Hellas) with its own board-space-bonus--bonusocean class', () => {
    // The CSS override that keeps this icon's two layers (tile + Hellas cost badge) from being
    // squashed into the generic 13x13/contain small-icon box (which would collapse both layers
    // onto the same centered spot, overlapping into a garbled blob) lives in MapThumbnail.vue's
    // scoped stylesheet, not something jsdom resolves here -- this only guards that the correct
    // class/markup reaches the DOM for that CSS rule to ever apply to.
    const definition = blankCustomBoard(3, 'Ocean Bonus');
    definition.spaces[0].bonus = [SpaceBonus.OCEAN];
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    expect(wrapper.find('.board-space-bonus--bonusocean').exists()).is.true;
  });

  it("renders the real Hellas board's ocean placement bonus (regression guard for the garbled-icon bug)", () => {
    const hellas = OFFICIAL_MAP_LIBRARY_BOARDS.find((b) => b.boardName === BoardName.HELLAS)!;
    const definition = decodeCustomBoard(hellas.code);
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    expect(wrapper.find('.board-space-bonus--bonusocean').exists()).is.true;
  });

  it('renders a Mars backdrop behind the hexes', () => {
    const definition = blankCustomBoard(9, 'Standard');
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    const style = (wrapper.find('.map-thumbnail-inner').element as HTMLElement).style;
    expect(style.background).to.contain('mars-without-venus.png');
  });

  it('sizes the backdrop to show the entire Mars image, nothing cropped and no margin wasted', () => {
    const definition = blankCustomBoard(9, 'Standard');
    const wrapper = mount(MapThumbnail, {...globalConfig, props: {definition}});
    const style = (wrapper.find('.map-thumbnail-inner').element as HTMLElement).style;
    // A full 9-row board maps 1:1 onto mars-without-venus.png's own scale (sx=sy=1), so the
    // margins computed to fit the whole image exactly fill the container out to the image's real
    // 620x600 size -- no more (wasted blank space) and no less (cropped track/backdrop).
    expect(style.width).eq('620px');
    expect(style.height).eq('600px');
    expect(style.background).to.contain('620px 600px');
  });

  it('defaults to a 160x130 box, and honors explicit width/height props', () => {
    const definition = blankCustomBoard(9, 'Standard');
    const defaultSize = mount(MapThumbnail, {...globalConfig, props: {definition}});
    const defaultStyle = (defaultSize.find('.map-thumbnail').element as HTMLElement).style;
    expect(defaultStyle.width).eq('160px');
    expect(defaultStyle.height).eq('130px');

    const bigger = mount(MapThumbnail, {...globalConfig, props: {definition, width: 300, height: 230}});
    const biggerStyle = (bigger.find('.map-thumbnail').element as HTMLElement).style;
    expect(biggerStyle.width).eq('300px');
    expect(biggerStyle.height).eq('230px');
  });
});
