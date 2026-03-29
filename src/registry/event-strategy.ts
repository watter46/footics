export interface StrategyParameter {
  id: string;
  type: "player" | "length" | "zone";
  label: string;
  required?: boolean;
}

export interface EventStrategy {
  id: string;
  label: string;
  description: string;
  color: string;
  sqlCondition: string | ((params: Record<string, any>) => string);
  params?: StrategyParameter[];
}

/**
 * sqlCondition を評価して SQL 文字列を取得するヘルパー。
 * 静的文字列ならそのまま返し、関数なら params を渡して評価する。
 */
export function resolveSqlCondition(
  strategy: EventStrategy,
  params: Record<string, any> = {}
): string {
  return typeof strategy.sqlCondition === "function"
    ? strategy.sqlCondition(params)
    : strategy.sqlCondition;
}
