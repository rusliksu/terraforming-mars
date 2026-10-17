/** Presentation data for our permanent grouped-selection controller. */
export type ModuleFilterBinding = {
  groups: ReadonlyArray<{key: string, label: string}>;
  itemsByGroup: Readonly<Record<string, ReadonlyArray<string>>>;
  selected: ReadonlyArray<string>;
  filterText: string;
  setFilter(value: string): void;
  toggle(name: string): void;
  selectAll(key: string): void;
  selectNone(key: string): void;
  invertSelection(key: string): void;
  showGroup(key: string): boolean;
  include(name: string): boolean;
  isSelectable(name: string): boolean;
  itemTitle(name: string): string | undefined;
  icon(module: string | undefined): string | undefined;
};
