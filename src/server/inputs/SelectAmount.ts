import {Message} from '../../common/logs/Message';
import {BasePlayerInput} from '../PlayerInput';
import {InputResponse, isSelectAmountResponse} from '../../common/inputs/InputResponse';
import {SelectAmountModel} from '../../common/models/PlayerInputModel';
import {InputError} from './InputError';
import {IPlayer} from '../IPlayer';
import {AmountPreview, AmountSide, AmountSideModel} from '../../common/models/AmountPreviewModel';

export class SelectAmount extends BasePlayerInput<number> {
  public selected: number = -1;

  constructor(
    title: string | Message,
    buttonLabel: string = 'Save',
    public min: number,
    public max: number,
    public maxByDefault?: boolean,
    private readonly preview?: AmountPreview,
  ) {
    super('amount', title);
    this.buttonLabel = buttonLabel;
  }

  public toModel(player?: IPlayer): SelectAmountModel {
    const model: SelectAmountModel = {
      title: this.title,
      buttonLabel: this.buttonLabel,
      type: 'amount',
      max: this.max,
      min: this.min,
      maxByDefault: this.maxByDefault ?? false,
    };
    if (this.preview !== undefined && player !== undefined) {
      model.preview = {sourceCard: this.preview.sourceCard,
        from: this.previewSide(this.preview.from, player), to: this.previewSide(this.preview.to, player)};
    }
    return model;
  }

  private previewSide(side: AmountSide, player: IPlayer): AmountSideModel {
    if (side.kind === 'cost') {
      return {...side};
    }
    const before = side.kind === 'card' ? player.tableau.get(side.card)?.resourceCount :
      side.kind === 'production' ? player.production[side.resource] : player.stock[side.resource];
    return {...side, before};
  }

  public process(input: InputResponse) {
    if (!isSelectAmountResponse(input)) {
      throw new InputError('Not a valid SelectAmountResponse');
    }
    if (isNaN(input.amount)) {
      throw new InputError('Amount is not a number');
    }
    if (input.amount > this.max) {
      throw new InputError('Amount provided too high (max ' + String(this.max) + ')');
    }
    if (input.amount < this.min) {
      throw new InputError('Amount provided too low (min ' + String(this.min) + ')');
    }
    this.selected = input.amount;
    return this.cb(input.amount);
  }
}
