export class UnsupportedEngineConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'UnsupportedEngineConfigError';
  }
}

export class EngineInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EngineInputError';
  }
}
