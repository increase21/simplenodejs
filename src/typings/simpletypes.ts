export type SimpleJSRateLimitType = { windowMs: number; max: number; keyGenerator?: (req: any) => string }
export type SimpleJSBodyParseType = { limit?: string | number; }