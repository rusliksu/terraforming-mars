import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource, ALL_RESOURCES} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {IndustryStandardProject, RESOURCE_LABEL, placeIndustryTile} from './IndustryStandardProject';

export class WildIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.WILD_INDUSTRY_STANDARD_PROJECT, 18, undefined, TileType.INDUSTRY_WILD, 1);
  }

  protected override actionEssence(player: IPlayer): void {
    const options = new OrOptions(
      ...ALL_RESOURCES.map((resource: Resource) =>
        new SelectOption(`Raise ${RESOURCE_LABEL[resource]} production and distribute ${RESOURCE_LABEL[resource]}`)
          .andThen(() => {
            placeIndustryTile(player, resource, this.tileType, this.distributionCount, this.name);
            return undefined;
          }),
      ),
    );
    options.title = 'Select a resource for the Wild industry tile';
    player.defer(options);
  }
}
