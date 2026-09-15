// Router config commands (router ospf, router rip, router eigrp, router bgp)

import type { CommandHandler } from './commandTypes';
import { bgpRouterHandlers } from './routerConfig/bgpRouterCommands';
import { ospfRouterHandlers } from './routerConfig/ospfRouterCommands';
import { eigrpRipRouterHandlers } from './routerConfig/eigrpRipRouterCommands';

export * from './routerConfig/bgpRouterCommands';
export * from './routerConfig/ospfRouterCommands';
export * from './routerConfig/eigrpRipRouterCommands';

export const routerConfigHandlers: Record<string, CommandHandler> = {
    ...eigrpRipRouterHandlers,
    ...ospfRouterHandlers,
    ...bgpRouterHandlers,
};
