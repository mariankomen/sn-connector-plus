export interface IDynamicAttributePath {
  getAttributeName(): string;
  getPath(): string;
  getLegacyAttributeName(): string;
  getLegacyGroupName(): string;
  isLegacy(): boolean;
}
