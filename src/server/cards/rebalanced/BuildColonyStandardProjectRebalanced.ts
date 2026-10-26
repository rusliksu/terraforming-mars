import {CardName} from '@/common/cards/CardName';
import {BuildColonyStandardProject} from '@/server/cards/colonies/BuildColonyStandardProject';

export class BuildColonyStandardProjectRebalanced extends BuildColonyStandardProject {
  public override get name() {
    return CardName.BUILD_COLONY_STANDARD_PROJECT_REBALANCED;
  }
}
