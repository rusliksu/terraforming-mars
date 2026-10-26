import {CardName} from '@/common/cards/CardName';
import {SpinoffDepartment} from '@/server/cards/colonies/SpinoffDepartment';

export class SpinoffDepartmentRebalanced extends SpinoffDepartment {
  public override get name() {
    return CardName.SPINOFF_DEPARTMENT_REBALANCED;
  }

  public override get cost() {
    return 13;
  }
}
