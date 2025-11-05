import Dexie, { type Table } from 'dexie';

// ============================================================================
// Types
// ============================================================================
export interface ITeam {
  id?: number;
  name: string;
  code?: string;
}

export interface IPlayer {
  id?: number;
  teamId: number;
  number: number;
  name: string;
  position: string;
}

export interface IMatch {
  id?: number;
  date: string;
  team1Id: number;
  team2Id: number;
}

export interface IActionMaster {
  id?: number;
  name: string;
  category: string;
}

export interface IEvent {
  id?: number;
  matchId: number;
  playerId: number | null;
  actionId: number;
  matchTime: string;
  opponentPosition?: string;
  memo?: string;
}

// Backward compatibility aliases
export type Match = IMatch;
export type TempTeam = ITeam;
export type TempPlayer = IPlayer;
export type ActionMaster = IActionMaster;
export type Event = IEvent;

// ============================================================================
// Dexie Database Class
// ============================================================================
class FooticsDB extends Dexie {
  teams!: Table<ITeam>;
  players!: Table<IPlayer>;
  matches!: Table<IMatch>;
  actions_master!: Table<IActionMaster>;
  events!: Table<IEvent>;

  // Backward compatibility aliases
  temp_teams!: Table<ITeam>;
  temp_players!: Table<IPlayer>;

  constructor() {
    super('FooticsDB');

    // バージョン3: category と opponentPosition フィールド追加
    this.version(3).stores({
      teams: '&id, name, code',
      players: '&id, teamId, number, name, position',
      matches: '++id, date, team1Id, team2Id',
      actions_master: '++id, name, category',
      events: '++id, matchId, playerId, opponentPosition, actionId, matchTime',
    });

    // Backward compatibility: map old table names to new ones
    this.temp_teams = this.teams;
    this.temp_players = this.players;
  }
} // ============================================================================
// Export a singleton instance
// ============================================================================
export const db = new FooticsDB();

// ============================================================================
// 初期データ投入
// ============================================================================
db.on('populate', async () => {
  try {
    // A. チーム初期データ
    await db.teams.bulkAdd([
      { id: 49, name: 'Chelsea', code: 'CHE' },
      { id: 42, name: 'Arsenal', code: 'ARS' },
      { id: 47, name: 'Tottenham Hotspur', code: 'TOT' },
      { id: 50, name: 'Manchester City', code: 'MAC' },
      { id: 40, name: 'Liverpool', code: 'LIV' },
    ]);

    // B. 選手初期データ（Chelsea選手のみ）
    await db.players.bulkAdd([
      {
        id: 298061,
        teamId: 49,
        name: 'Ted Curd',
        number: 13,
        position: 'Goalkeeper',
      },
      {
        id: 286616,
        teamId: 49,
        name: 'F. Jörgensen',
        number: 12,
        position: 'Goalkeeper',
      },
      {
        id: 287868,
        teamId: 49,
        name: 'Max Merrick',
        number: 50,
        position: 'Goalkeeper',
      },
      {
        id: 18959,
        teamId: 49,
        name: 'Robert Sánchez',
        number: 1,
        position: 'Goalkeeper',
      },
      {
        id: 64167,
        teamId: 49,
        name: 'G. Słonina',
        number: 44,
        position: 'Goalkeeper',
      },
      {
        id: 366735,
        teamId: 49,
        name: 'Joshua Kofi Acheampong',
        number: 34,
        position: 'Defender',
      },
      {
        id: 19145,
        teamId: 49,
        name: 'T. Adarabioyo',
        number: 4,
        position: 'Defender',
      },
      {
        id: 95,
        teamId: 49,
        name: 'B. Badiashile',
        number: 5,
        position: 'Defender',
      },
      {
        id: 19720,
        teamId: 49,
        name: 'T. Chalobah',
        number: 23,
        position: 'Defender',
      },
      {
        id: 152953,
        teamId: 49,
        name: 'L. Colwill',
        number: 6,
        position: 'Defender',
      },
      {
        id: 47380,
        teamId: 49,
        name: 'Marc Cucurella',
        number: 3,
        position: 'Defender',
      },
      {
        id: 22094,
        teamId: 49,
        name: 'W. Fofana',
        number: 29,
        position: 'Defender',
      },
      {
        id: 161907,
        teamId: 49,
        name: 'M. Gusto',
        number: 27,
        position: 'Defender',
      },
      {
        id: 341642,
        teamId: 49,
        name: 'J. Hato',
        number: 21,
        position: 'Defender',
      },
      {
        id: 19545,
        teamId: 49,
        name: 'R. James',
        number: 24,
        position: 'Midfielder',
      },
      {
        id: 305834,
        teamId: 49,
        name: 'Andrey Santos',
        number: 17,
        position: 'Midfielder',
      },
      {
        id: 398000,
        teamId: 49,
        name: 'G. Antwi',
        number: 2,
        position: 'Midfielder',
      },
      {
        id: 311334,
        teamId: 49,
        name: 'F. Buonanotte',
        number: 40,
        position: 'Midfielder',
      },
      {
        id: 116117,
        teamId: 49,
        name: 'M. Caicedo',
        number: 25,
        position: 'Midfielder',
      },
      {
        id: 308678,
        teamId: 49,
        name: 'Dário Essugo',
        number: 14,
        position: 'Midfielder',
      },
      {
        id: 5996,
        teamId: 49,
        name: 'E. Fernández',
        number: 8,
        position: 'Midfielder',
      },
      {
        id: 394167,
        teamId: 49,
        name: 'O. Harrison',
        number: 6,
        position: 'Midfielder',
      },
      {
        id: 282125,
        teamId: 49,
        name: 'R. Lavia',
        number: 45,
        position: 'Midfielder',
      },
      {
        id: 152982,
        teamId: 49,
        name: 'C. Palmer',
        number: 10,
        position: 'Midfielder',
      },
      {
        id: 327733,
        teamId: 49,
        name: 'Sam Rak-Sakyi',
        number: 8,
        position: 'Midfielder',
      },
      {
        id: 482888,
        teamId: 49,
        name: 'R. Walsh',
        number: 46,
        position: 'Midfielder',
      },
      {
        id: 161948,
        teamId: 49,
        name: 'L. Delap',
        number: 9,
        position: 'Attacker',
      },
      {
        id: 425733,
        teamId: 49,
        name: 'Estêvão',
        number: 41,
        position: 'Attacker',
      },
      {
        id: 284324,
        teamId: 49,
        name: 'A. Garnacho',
        number: 49,
        position: 'Midfielder',
      },
      {
        id: 334037,
        teamId: 49,
        name: 'Tyrique George',
        number: 32,
        position: 'Attacker',
      },
      {
        id: 286894,
        teamId: 49,
        name: 'J. Bynoe-Gittens',
        number: 11,
        position: 'Attacker',
      },
      {
        id: 392270,
        teamId: 49,
        name: 'Marc Guiu',
        number: 38,
        position: 'Attacker',
      },
      {
        id: 10329,
        teamId: 49,
        name: 'João Pedro',
        number: 20,
        position: 'Attacker',
      },
      {
        id: 359117,
        teamId: 49,
        name: 'Shumaira Mheuka',
        number: 9,
        position: 'Attacker',
      },
      {
        id: 1864,
        teamId: 49,
        name: 'Pedro Neto',
        number: 7,
        position: 'Midfielder',
      },
    ]);

    // C. 戦術タグ初期データ
    await db.actions_master.bulkAdd([
      // 🟩 攻撃（Offensive Actions）
      // パス関連
      { name: 'ショートパス', category: '攻撃' },
      { name: 'ロングパス', category: '攻撃' },
      { name: 'スルーパス', category: '攻撃' },
      { name: 'クロス', category: '攻撃' },
      { name: 'ワンツー', category: '攻撃' },
      { name: 'バックパス', category: '攻撃' },
      { name: 'サイドチェンジ', category: '攻撃' },
      // シュート関連
      { name: 'シュート', category: '攻撃' },
      { name: '枠内シュート', category: '攻撃' },
      { name: 'ミドルシュート', category: '攻撃' },
      { name: 'ヘディングシュート', category: '攻撃' },
      { name: 'ボレー', category: '攻撃' },
      { name: 'ゴール', category: '攻撃' },
      { name: '決定機逸', category: '攻撃' },
      // ボール保持・前進
      { name: 'ドリブル', category: '攻撃' },
      { name: 'キープ（ボール保持）', category: '攻撃' },
      { name: 'ターン', category: '攻撃' },
      { name: 'トラップ', category: '攻撃' },
      { name: '体の向きでのフェイント', category: '攻撃' },
      { name: '前進パス受け', category: '攻撃' },
      { name: 'ポストプレー', category: '攻撃' },
      // チャンスメイク
      { name: 'アシスト', category: '攻撃' },
      { name: 'キーパス', category: '攻撃' },
      { name: 'クロス成功', category: '攻撃' },
      { name: 'ラストパス', category: '攻撃' },
      { name: 'プレアシスト', category: '攻撃' },
      // セットプレー
      { name: 'コーナーキック', category: '攻撃' },
      { name: 'フリーキック', category: '攻撃' },
      { name: 'PKキック', category: '攻撃' },
      { name: 'スローイン', category: '攻撃' },

      // 🟥 守備（Defensive Actions）
      // 対人・デュエル
      { name: 'タックル', category: '守備' },
      { name: 'インターセプト', category: '守備' },
      { name: 'デュエル（空中戦）', category: '守備' },
      { name: 'デュエル（地上戦）', category: '守備' },
      { name: 'マークコントロール', category: '守備' },
      { name: 'ボディコンタクト', category: '守備' },
      { name: 'プレス', category: '守備' },
      { name: 'チェイシング', category: '守備' },
      // ブロック・カバー
      { name: 'シュートブロック', category: '守備' },
      { name: 'パスブロック', category: '守備' },
      { name: 'カバーリング', category: '守備' },
      { name: 'ディレイ', category: '守備' },
      { name: 'クリア', category: '守備' },
      { name: 'ヘディングクリア', category: '守備' },
      { name: 'スライディング', category: '守備' },
      // 守備組織・ポジショニング
      { name: 'ラインコントロール', category: '守備' },
      { name: 'コンパクトネス維持', category: '守備' },
      { name: 'カバーシャドウ', category: '守備' },
      { name: 'サポートディフェンス', category: '守備' },
      { name: 'トラッキング', category: '守備' },
      { name: 'ステップアップ', category: '守備' },
      { name: 'ドロップバック', category: '守備' },

      // 🟨 トランジション（Transition）
      // 守→攻
      { name: 'カウンター開始', category: 'トランジション' },
      { name: '奪取後の前進', category: 'トランジション' },
      { name: '縦パス即通し', category: 'トランジション' },
      // 攻→守
      { name: 'ネガトラ（即時プレス）', category: 'トランジション' },
      { name: '戻り対応', category: 'トランジション' },
      { name: 'ファウル戦術', category: 'トランジション' },

      // 🟦 プレーファウル・イベント（Game Events）
      { name: 'ファウル', category: 'イベント' },
      { name: 'カード（黄）', category: 'イベント' },
      { name: 'カード（赤）', category: 'イベント' },
      { name: 'オフサイド', category: 'イベント' },
      { name: 'VAR判定', category: 'イベント' },
      { name: '得点', category: 'イベント' },
      { name: '失点', category: 'イベント' },
      { name: '交代IN', category: 'イベント' },
      { name: '交代OUT', category: 'イベント' },
      { name: '負傷', category: 'イベント' },

      // ⚪ メンタル・判断・その他（Intangibles）
      { name: '判断の速さ', category: 'メンタル/その他' },
      { name: 'コミュニケーション', category: 'メンタル/その他' },
      { name: 'クレバーな対応', category: 'メンタル/その他' },
      { name: 'ポジティブラン', category: 'メンタル/その他' },
      { name: '消極的対応', category: 'メンタル/その他' },
      { name: '集中力', category: 'メンタル/その他' },
    ]);

    console.log('初期データの投入が完了しました');
  } catch (error) {
    console.error('初期データの投入に失敗しました:', error);
  }
});
