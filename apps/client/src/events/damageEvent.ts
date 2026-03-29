export type DamageEvent = {
  tickId: number;
  eventId: string;
  sourceType: "entity" | "environment";
  sourceId: number;
  targetId: number;
  amount: number;
  sourceX: number;
  sourceY: number;
};

export type DamageEventPayload = Omit<DamageEvent, "eventId">;
