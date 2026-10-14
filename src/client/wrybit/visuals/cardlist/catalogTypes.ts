export type FilterOption<K extends string = string> = {
  key: K;
  label: string;
  iconClass?: string;
  colorClass?: string;
};

export type CardBoxSize = {width: number, height: number};
export type SectionPart = {label: string, colorClass: string, count: number};

export function optionKeys<K extends string>(options: ReadonlyArray<FilterOption<K>>): Array<K> {
  return options.map((option) => option.key);
}
