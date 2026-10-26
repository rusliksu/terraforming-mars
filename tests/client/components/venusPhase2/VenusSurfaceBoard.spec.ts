import {mount} from '@vue/test-utils';
import {globalConfig} from '../getLocalVue';
import {expect} from 'chai';
import VenusSurfaceBoard from '@/client/components/venusPhase2/VenusSurfaceBoard.vue';
import {VenusPhase2Model} from '@/common/models/VenusPhase2Model';
import {SpaceType} from '@/common/boards/SpaceType';
import {SpaceId} from '@/common/Types';

function space(id: SpaceId, x: number, y: number, spaceType: SpaceType = SpaceType.LAND) {
  return {id, x, y, spaceType, bonus: []};
}

describe('VenusSurfaceBoard', () => {
  it('draws a leader-line legend entry for Stratopolis and Maxwell Base when on-grid', () => {
    const model: VenusPhase2Model = {
      spaces: [
        space('100', 0, 0),
        space('298', 1, 0, SpaceType.COLONY), // Stratopolis
        space('299', 2, 0, SpaceType.COLONY), // Maxwell Base
      ],
    };
    const wrapper = mount(VenusSurfaceBoard, {
      ...globalConfig,
      props: {model},
    });

    const legend = wrapper.find('.venus-board-legend');
    expect(legend.exists()).to.be.true;
    expect(legend.findAll('g')).to.have.lengthOf(2);
    expect(legend.text()).to.include('Stratopolis');
    expect(legend.text()).to.include('Maxwell');
    expect(legend.text()).to.include('Base');
    // No on-hex text for on-grid reserved spaces anymore -- only the legend labels them.
    expect(wrapper.find('.board-space-text').exists()).to.be.false;
  });

  it('pushes a reserved-space label away from the board center, not back toward it', () => {
    const model: VenusPhase2Model = {
      spaces: [
        space('298', 0, 0, SpaceType.COLONY), // Stratopolis, in the board's top-left corner here
        space('100', 6, 6), // just to give the board real extent beyond a single point
      ],
    };
    const wrapper = mount(VenusSurfaceBoard, {
      ...globalConfig,
      props: {model},
    });

    const line = wrapper.find('.venus-board-legend line');
    expect(line.exists()).to.be.true;
    // x1/y1 is the label end, x2/y2 is the dot on the space itself (see the template). Stratopolis
    // sits toward the top-left here, so the label should land further toward that same corner
    // than the dot -- pulling it back in toward the center would land it on top of other hexes.
    expect(Number(line.attributes('x1'))).to.be.lessThan(Number(line.attributes('x2')));
    expect(Number(line.attributes('y1'))).to.be.lessThan(Number(line.attributes('y2')));
  });

  it('falls back to a plain on-hex label in the off-grid outer-spaces tray', () => {
    const model: VenusPhase2Model = {
      spaces: [
        space('100', 0, 0),
        space('298', -1, -1, SpaceType.COLONY), // Stratopolis, off-grid fallback
      ],
    };
    const wrapper = mount(VenusSurfaceBoard, {
      ...globalConfig,
      props: {model},
    });

    expect(wrapper.find('.venus-board-legend').exists()).to.be.false;
    expect(wrapper.find('.venus-board-outer-spaces .board-space-text').text()).to.eq('Stratopolis');
  });

  it('omits the legend entirely when neither reserved space is on-grid', () => {
    const model: VenusPhase2Model = {
      spaces: [space('100', 0, 0)],
    };
    const wrapper = mount(VenusSurfaceBoard, {
      ...globalConfig,
      props: {model},
    });

    expect(wrapper.find('.venus-board-legend').exists()).to.be.false;
  });

  it('shows 0–30 and moves the marker with the current Venus value', async () => {
    const model: VenusPhase2Model = {spaces: [space('100', 0, 0)]};
    const wrapper = mount(VenusSurfaceBoard, {...globalConfig, props: {model}});
    expect(wrapper.findAll('.global-numbers-venus .global-numbers-value').map((n) => n.text())).deep.eq(
      ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30']);
    expect(wrapper.find('.val-is-active').text()).eq('0');
    await wrapper.setProps({venusScaleLevel: 28});
    expect(wrapper.find('.val-is-active').text()).eq('28');
    await wrapper.setProps({venusScaleLevel: 30});
    expect(wrapper.find('.val-is-active').text()).eq('30');
    expect(wrapper.find('.venus-scale-track svg').attributes('aria-label')).contains('30 / 30%');
  });

  it('uses the saved limit when displaying a legacy game', () => {
    const model: VenusPhase2Model = {spaces: [space('100', 0, 0)]};
    const wrapper = mount(VenusSurfaceBoard, {...globalConfig, props: {model, venusScaleMax: 60, venusScaleLevel: 58}});
    expect(wrapper.findAll('.global-numbers-value').at(-1)?.text()).eq('60');
    expect(wrapper.findAll('.val-is-active').map((n) => n.text())).deep.eq(['58']);
    expect(wrapper.find('.venus-scale-track svg').attributes('aria-label')).contains('58 / 60%');
  });

  it('keeps the alternative Venus bonuses only on the original 0–30 track', () => {
    const model: VenusPhase2Model = {spaces: [space('100', 0, 0)]};
    const wrapper = mount(VenusSurfaceBoard, {...globalConfig, props: {model, venusScaleMax: 60, altVenusBoard: true}});
    expect(wrapper.findAll('.std-wild-resource')).to.have.lengthOf(7);
    expect(wrapper.findAll('.wild-resource')).to.have.lengthOf(1);
  });
});
