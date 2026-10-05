import type { IconName } from "./names";
import { ACTION_ICONS } from "./sets/actions";
import { CORE_ICONS } from "./sets/core";
import { FOOD_ICONS } from "./sets/food";
import { HEALTH_ICONS } from "./sets/health";
import { HOME_ICONS } from "./sets/home";
import { PEOPLE_ICONS } from "./sets/people";
import { TIME_ICONS } from "./sets/time";
import { VETERINARY_ICONS } from "./sets/veterinary";
import { WARNING_ICONS } from "./sets/warnings";
import type { IconComponent, IconProps } from "./svg";

export { PawShape } from "./paw";
export type { IconProps } from "./svg";

export const ICONS = {
  ...CORE_ICONS,
  ...HEALTH_ICONS,
  ...VETERINARY_ICONS,
  ...FOOD_ICONS,
  ...HOME_ICONS,
  ...TIME_ICONS,
  ...PEOPLE_ICONS,
  ...WARNING_ICONS,
  ...ACTION_ICONS,
} satisfies Record<IconName, IconComponent>;

export const Icon: React.FC<IconProps & { readonly name: IconName }> = ({ name, ...rest }) => {
  const Component: IconComponent | undefined = ICONS[name];
  if (!Component) {
    throw new Error(`Unknown icon "${name}"`);
  }
  return <Component {...rest} />;
};
