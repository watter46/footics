# Footics MVP フェーズ 1: 開発仕様ドキュメント

## 1. プロジェクト概要 (フェーズ 1)

**目的:**
ネットワーク環境に依存せず、オフライン（スタジアム等）でも快適に「個人の感性（戦術的視点）」を記録できるローカル完結型の観戦記録 Web アプリ（PWA）を最速で開発し、そのコア体験を検証する。

**コア機能:**

- 観戦する試合、選手、戦術タグをローカル（IndexedDB）に仮登録できる。
- 試合中、直感的な UI（ピッチ図）から「どの選手が」「どんなアクションをしたか」「いつ（試合時間）」を素早く記録できる。
- 記録した内容をローカルで閲覧・編集できる。

## 2. 技術スタック

- **フレームワーク:** Next.js (App Router, クライアントサイド中心で実装)
- **ローカル DB:** IndexedDB
- **IndexedDB ラッパー:** dexie.js (強く推奨)

## 3. プロダクト用語集（スキーマ定義）

| 用語                        | テーブル名       | 概要                                                 |
| :-------------------------- | :--------------- | :--------------------------------------------------- |
| **試合 (Match)**            | `matches`        | ユーザーが登録した観戦対象の試合。                   |
| **チーム (Team)**           | `temp_teams`     | ユーザーが仮登録したチーム。                         |
| **選手 (Player)**           | `temp_players`   | ユーザーが仮登録した選手。必ず**チーム**に所属する。 |
| **戦術アクション (Action)** | `actions_master` | 記録する戦術タグ（#デコイラン等）のマスターデータ。  |
| **イベント (Event)**        | `events`         | 試合中に発生し、ユーザーが記録した具体的な出来事。   |

## 4. DB スキーマ (dexie.js)

`dexie.js` を使ったデータベースの初期化とテーブル定義のサンプルコードです。

```javascript
// lib/db.js (またはhooks/useDb.js など)

import Dexie from 'dexie';

/**
 * Footicsのローカルデータベース
 * @type {Dexie & {
 * matches: Dexie.Table<Match, number>,
 * temp_teams: Dexie.Table<Team, number>,
 * temp_players: Dexie.Table<Player, number>,
 * actions_master: Dexie.Table<ActionMaster, number>,
 * events: Dexie.Table<Event, number>
 * }}
 */
export const db = new Dexie('FooticsDB');

// スキーマ定義
// '++id' = 自動採番のプライマリキー
// '&name' = ユニーク制約 (重複防止)
// 'teamId', 'matchId' など = 検索高速化のためのインデックス
db.version(1).stores({
  matches: '++id, date, team1Id, team2Id',
  temp_teams: '++id, &name',
  temp_players: '++id, teamId, number, name',
  actions_master: '++id, &name',
  events: '++id, matchId, playerId, actionId, matchTime',
});

// TypeScript用の型定義 (任意)
export interface Match {
  id?: number;
  date: string; // または Date
  team1Id: number; // -> temp_teams.id
  team2Id: number; // -> temp_teams.id
  // 試合時間管理用 (任意)
  // startTime: number; // (timestamp)
  // timerStatus: 'pending' | 'running' | 'paused' | 'finished';
}

export interface Team {
  id?: number;
  name: string; // 例: "チェルシー"
}

export interface Player {
  id?: number;
  teamId: number; // -> temp_teams.id
  number: number; // 背番号
  position: string; // 例: "FW", "MF"
  name: string; // 例: "コール・パーマー"
}

export interface ActionMaster {
  id?: number;
  name: string; // 例: "#デコイラン"
  // group: string; // (任意) お気に入りやグループ分け用
}

export interface Event {
  id?: number;
  matchId: number; // -> matches.id
  playerId: number; // -> temp_players.id
  actionId: number; // -> actions_master.id
  matchTime: string; // 例: "前半31分" または "31:05"
  memo: string; // 自由記述メモ (詳細編集時に追記)
}
```

5. 画面フロー
   / (トップページ = 試合一覧)

matches テーブルの内容を一覧表示する。

「新しい試合を登録」機能（matches テーブルへの Create）。

登録時、temp_teams から チーム 1 と チーム 2 を選択する。

一覧から試合を選ぶと /matches/[id] へ遷移。

/matches/[id] (アクション記録ページ)

このアプリのメイン画面。

単一 URL（タブ切り替え）方式を採用する。（クライアントサイドでの状態共有と高速な UI 切り替えのため）

「Record」「History」「Setup」の 3 タブ（コンポーネント）構成。

/master_setup (マスターデータ管理ページ)

(オプション機能) / から遷移できる設定ページ。

temp_teams, temp_players, actions_master の一覧・編集・新規登録を行う CRUD 画面。

6. メイン画面 (/matches/[id]) UI/UX 仕様
   3 タブ構成
1. Setup タブ
   UI: この試合（matchId）に関する設定を行うフォーム群。

機能:

タイマー管理: 「前半開始」「後半開始」「（任意）一時停止」ボタンを配置。これが Record タブのタイマーの基準（startTime）となる。

選手登録: temp_players への選手（両チーム）の新規登録・編集。（モーダルなどで手早く登録）

スタメン設定: temp_players からこの試合の「スタメン 11 人」（両チーム）を選び、Record タブのピッチ UI に紐付ける。

2. Record タブ (デフォルト)
   UI: ピッチ（サッカーコート）の UI をメインに配置。

タイマー: Setup タブで開始された時間を基準に、試合時間（例: 31:05）をリアルタイムで表示。

選手配置: Setup タブで設定された「スタメン 11 人」がピッチ（またはリスト）に表示される。

操作 (最速記録フロー):

ユーザーがピッチ上の選手（または選手リスト）をタップ。

ボトムシートが開き、actions_master の一覧が Grid 表示される。

ユーザーがアクション（タグ）をタップ。

自動保存: events テーブルに以下の情報が即時保存される。

matchId (現在の試合 ID)

playerId (タップした選手 ID)

actionId (タップしたアクション ID)

matchTime (その瞬間のタイマーの値。例: "前半 31 分")

memo (空欄 "")

トースト通知（「記録しました！」）が表示され、ボトムシートが閉じる。

3. History タブ
   UI: events テーブルの内容を、現在の matchId で絞り込み、matchTime 順（または新しい順）で一覧表示するリスト。

操作 (詳細編集フロー):

ユーザーがリスト項目（例: 「前半 31 分: パーマー - #プレス回避」）をタップ。

詳細編集モーダルが開く。

memo（自由記述）の追記・編集ができる。

（任意）matchTime や playerId などの修正も可能にする。
