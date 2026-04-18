/**
 * Query Builder — フィルタ条件 → SQL WHERE 句変換
 *
 * 責務:
 * - FilterState を受け取り、DuckDB 用の完全な SQL クエリ文字列を生成。
 * - Strategy Pattern の resolveSqlCondition と連携。
 * - SQL インジェクション対策: team_id, player_id は数値のみ許可。
 */

import { eventStrategies } from '@/registry';
import { resolveSqlCondition } from '@/registry/event-strategy';
import type { FilterState } from '@/types';

/**
 * フィルタ条件から WHERE 句を生成
 */
function buildWhereClause(filters: FilterState): string {
  const conditions: string[] = ['TRUE'];

  // Team filter
  if (filters.selectedTeam !== 'all') {
    const teamId = Number(filters.selectedTeam);
    if (!Number.isFinite(teamId)) throw new Error('Invalid team_id');
    conditions.push(`team_id = ${teamId}`);
  }

  // Player filter
  if (filters.selectedPlayers.size > 0) {
    const playerIds = Array.from(filters.selectedPlayers)
      .map((id) => {
        if (!Number.isFinite(id)) throw new Error('Invalid player_id');
        return id;
      })
      .join(',');
    conditions.push(`player_id IN (${playerIds})`);
  }

  // Outcome filter
  if (filters.outcomeFilter === 'success') {
    conditions.push('outcome = true');
  } else if (filters.outcomeFilter === 'fail') {
    conditions.push('outcome = false');
  }

  // Strategy filters (OR within strategies, AND with other conditions)
  if (filters.activeStrategies.size > 0) {
    const strategyConditions = Array.from(filters.activeStrategies).map(
      (id) => {
        const strategy = eventStrategies.find((s) => s.id === id);
        if (!strategy) return 'FALSE';
        const params = (filters.activeStrategyParams[id] || {}) as Record<
          string,
          unknown
        >;
        return `(${resolveSqlCondition(strategy, params)})`;
      },
    );
    conditions.push(`(${strategyConditions.join(' OR ')})`);
  }

  return conditions.join(' AND ');
}

/**
 * Strategy projection columns for boolean flags
 */
function buildStrategyProjections(filters: FilterState): string {
  return eventStrategies
    .map((s) => {
      const params = (filters.activeStrategyParams[s.id] || {}) as Record<
        string,
        unknown
      >;
      const resolved = resolveSqlCondition(s, params);
      return `(${resolved}) AS is_strategy_${s.id.replace(/-/g, '_')}`;
    })
    .join(', ');
}

/**
 * COUNT クエリを生成
 */
export function buildCountQuery(filters: FilterState): string {
  const where = buildWhereClause(filters);
  const parts: string[] = [];

  if (
    filters.timelineSource === 'all' ||
    filters.timelineSource === 'whoscored'
  ) {
    parts.push(`SELECT id FROM events WHERE ${where}`);
  }
  if (filters.timelineSource === 'all' || filters.timelineSource === 'custom') {
    parts.push(`SELECT id FROM custom_events`);
  }

  const unionSql = parts.join(' UNION ALL ');

  return `
    WITH combined_events AS (
      ${unionSql || 'SELECT NULL AS id WHERE FALSE'}
    )
    SELECT count(*) AS total FROM combined_events
  `;
}

/**
 * データ取得クエリを生成（全件取得、仮想スクロール対応）
 */
export function buildQuery(filters: FilterState): string {
  const where = buildWhereClause(filters);
  const eventStrategiesCols = buildStrategyProjections(filters);
  const customStrategiesCols = eventStrategies
    .map((s) => `FALSE AS is_strategy_${s.id.replace(/-/g, '_')}`)
    .join(', ');

  const parts: string[] = [];

  if (
    filters.timelineSource === 'all' ||
    filters.timelineSource === 'whoscored'
  ) {
    parts.push(`
      SELECT 
        id::VARCHAR AS id,
        match_id::VARCHAR AS match_id,
        event_id,
        team_id,
        player_id,
        period,
        minute,
        second,
        expanded_minute,
        x, y, end_x, end_y,
        type_value,
        type_name,
        outcome,
        is_touch,
        is_shot,
        is_goal,
        qualifiers,
        'whoscored' AS source,
        NULL AS custom_label,
        NULL AS custom_memo
        ${eventStrategiesCols ? ', ' + eventStrategiesCols : ''}
      FROM events
      WHERE ${where}
    `);
  }

  if (filters.timelineSource === 'all' || filters.timelineSource === 'custom') {
    parts.push(`
      SELECT 
        id,
        match_id,
        NULL AS event_id,
        NULL AS team_id,
        NULL AS player_id,
        1 AS period,
        minute,
        second,
        minute AS expanded_minute,
        NULL AS x, NULL AS y, NULL AS end_x, NULL AS end_y,
        NULL AS type_value,
        label AS type_name,
        TRUE AS outcome,
        FALSE AS is_touch,
        FALSE AS is_shot,
        FALSE AS is_goal,
        NULL AS qualifiers,
        'custom' AS source,
        label AS custom_label,
        memo AS custom_memo
        ${customStrategiesCols ? ', ' + customStrategiesCols : ''}
      FROM custom_events
    `);
  }

  const unionSql = parts.join(' UNION ALL ');

  return `
    WITH combined_events AS (
      ${unionSql || 'SELECT NULL AS id WHERE FALSE'}
    )
    SELECT *
    FROM combined_events 
    ORDER BY expanded_minute ASC, minute ASC, second ASC
  `;
}

// (End of file, replaced above)
