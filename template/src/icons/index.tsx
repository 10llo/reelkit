import type { IconName } from "./names";
import { CORE_ICONS } from "./sets/core";
import { FOOD_ICONS } from "./sets/food";
import { HEALTH_ICONS } from "./sets/health";
import { VETERINARY_ICONS } from "./sets/veterinary";
import type { IconComponent, IconProps } from "./svg";

export { PawShape } from "./paw";
export type { IconProps } from "./svg";

export const ICONS = {
  ...CORE_ICONS,
  ...HEALTH_ICONS,
  ...VETERINARY_ICONS,
  ...FOOD_ICONS,
} satisfies Record<IconName, IconComponent>;

export const Icon: React.FC<IconProps & { readonly name: IconName }> = ({ name, ...rest }) => {
  const Component: IconComponent | undefined = ICONS[name];
  if (!Component) {
    throw new Error(`Unknown icon "${name}"`);
  }
  return <Component {...rest} />;
};
