import { z } from "zod";

export const followTargetSchema = z.object({ profileId: z.uuid() });
export const removeFollowerSchema = z.object({ followerId: z.uuid() });
