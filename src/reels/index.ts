import { cssSubgrid } from "./css-subgrid/reel";
import { redisAllkeysVolatile } from "./redis-allkeys-volatile/reel";
import { redisLruLfu } from "./redis-lru-lfu/reel";
import type { ReelDefinition } from "@/lib/reel/types";

/** Reels 是手寫的動畫腳本，不像貼文能從 Markdown 產生，所以直接在這裡註冊 */
export const REELS: ReelDefinition[] = [cssSubgrid, redisLruLfu, redisAllkeysVolatile];

export const findReel = (id: string) => REELS.find((reel) => reel.id === id);
