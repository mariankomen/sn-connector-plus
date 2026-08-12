import { IDynamicAttribute } from "./IDtnamicAttribute";
import { IDynamicAttributePath } from "./IDynamicAttributePath";

export interface IDynamicNamespace {
  getName(): string;
  isActive(): boolean;
  isTransient(): boolean;
  getAttribute(path: IDynamicAttributePath): IDynamicAttribute;
}
