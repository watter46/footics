import type { IActionMaster, ITeam } from '@/lib/types';

export const TEAM_SEED_DATA: ITeam[] = [
  { id: 49, name: 'Chelsea', code: 'CHE' },
  { id: 42, name: 'Arsenal', code: 'ARS' },
  { id: 47, name: 'Tottenham Hotspur', code: 'TOT' },
  { id: 50, name: 'Manchester City', code: 'MAC' },
  { id: 40, name: 'Liverpool', code: 'LIV' },
];

type ActionSeedInput = Omit<IActionMaster, 'isFavorite'>;

const ACTION_MASTER_SEED_SOURCE: ActionSeedInput[] = [
  // 🟩 攻撃(Offensive Actions)
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
  { name: 'キープ(ボール保持)', category: '攻撃' },
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

  // 🟥 守備(Defensive Actions)
  // 対人・デュエル
  { name: 'タックル', category: '守備' },
  { name: 'インターセプト', category: '守備' },
  { name: 'デュエル(空中戦)', category: '守備' },
  { name: 'デュエル(地上戦)', category: '守備' },
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

  // 🟨 トランジション(Transition)
  // 守→攻
  { name: 'カウンター開始', category: 'トランジション' },
  { name: '奪取後の前進', category: 'トランジション' },
  { name: '縦パス即通し', category: 'トランジション' },
  // 攻→守
  { name: 'ネガトラ(即時プレス)', category: 'トランジション' },
  { name: '戻り対応', category: 'トランジション' },
  { name: 'ファウル戦術', category: 'トランジション' },

  // 🟦 プレーファウル・イベント(Game Events)
  { name: 'ファウル', category: 'イベント' },
  { name: 'カード(黄)', category: 'イベント' },
  { name: 'カード(赤)', category: 'イベント' },
  { name: 'オフサイド', category: 'イベント' },
  { name: 'VAR判定', category: 'イベント' },
  { name: '得点', category: 'イベント' },
  { name: '失点', category: 'イベント' },
  { name: '交代IN', category: 'イベント' },
  { name: '交代OUT', category: 'イベント' },
  { name: '負傷', category: 'イベント' },

  // ⚪ メンタル・判断・その他(Intangibles)
  { name: '判断の速さ', category: 'メンタル/その他' },
  { name: 'コミュニケーション', category: 'メンタル/その他' },
  { name: 'クレバーな対応', category: 'メンタル/その他' },
  { name: 'ポジティブラン', category: 'メンタル/その他' },
  { name: '消極的対応', category: 'メンタル/その他' },
  { name: '集中力', category: 'メンタル/その他' },
];

export const ACTION_MASTER_SEED: IActionMaster[] =
  ACTION_MASTER_SEED_SOURCE.map(action => ({
    ...action,
    isFavorite: false,
  }));
