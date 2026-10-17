import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type Alternative =
  RouterOutputs["finance"]["investments"]["list"][number];
export type Comparison = RouterOutputs["finance"]["investments"]["compare"];
