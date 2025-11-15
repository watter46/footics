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
  // 1. パス (Pass)
  { name: 'ショートパス', category: 'パス' },
  { name: 'ロングパス', category: 'パス' },
  { name: 'クロス', category: 'パス' },
  { name: 'スルーパス', category: 'パス' },
  { name: 'アシスト', category: 'パス' },
  { name: 'コーナーキック', category: 'パス' },
  { name: 'フリーキック', category: 'パス' },
  { name: 'キーパス', category: 'パス' },
  { name: 'サイドチェンジ', category: 'パス' },
  { name: '楔のパス', category: 'パス' },
  { name: 'スローイン', category: 'パス' },

  // 2. キャリー (Carry)
  { name: 'ドリブル', category: 'キャリー' },
  { name: 'キープ', category: 'キャリー' },
  { name: '運ぶ', category: 'キャリー' },

  // 3. コントロール (Control)
  { name: 'トラップ', category: 'コントロール' },
  { name: 'ターン', category: 'コントロール' },
  { name: 'ポストプレー', category: 'コントロール' },
  { name: 'フェイント', category: 'コントロール' },

  // 4. シュート (Shoot)
  { name: 'ゴール', category: 'シュート' },
  { name: '枠内シュート', category: 'シュート' },
  { name: '枠外シュート', category: 'シュート' },
  { name: 'ミドルシュート', category: 'シュート' },
  { name: 'ヘディング', category: 'シュート' },

  // 5. 守備 (Defence)
  { name: 'タックル', category: '守備' },
  { name: 'インターセプト', category: '守備' },
  { name: 'プレス', category: '守備' },
  { name: 'クリア', category: '守備' },
  { name: 'シュートブロック', category: '守備' },
  { name: '地上戦', category: '守備' },
  { name: '空中戦', category: '守備' },
  { name: 'カウンタープレス', category: '守備' },
  { name: 'カバー', category: '守備' },
  { name: 'プレスバック', category: '守備' },
  { name: 'ディレイ', category: '守備' },
  { name: 'コンタクト', category: '守備' },
  { name: 'クロス対応', category: '守備' },
  { name: 'ポジショニング(守備)', category: '守備' },
  { name: 'マーク', category: '守備' },
  { name: 'ラインコントロール', category: '守備' },

  // 6. オフザボール (Off the Ball)
  { name: '裏抜け', category: 'オフザボール' },
  { name: 'デコイ', category: 'オフザボール' },
  { name: 'チェックイン', category: 'オフザボール' },
  { name: 'プルアウェイ', category: 'オフザボール' },
  { name: 'ポジショニング(攻撃)', category: 'オフザボール' },
  { name: 'オーバーラップ', category: 'オフザボール' },
  { name: 'アンダーラップ', category: 'オフザボール' },

  // 7. GK (Goalkeeper)
  { name: 'セーブ', category: 'GK' },
  { name: 'キャッチ', category: 'GK' },
  { name: 'パンチング', category: 'GK' },
  { name: 'ロングキック', category: 'GK' },
  { name: 'スイーパー', category: 'GK' },

  // 8. エラー (Error)
  { name: 'ボールロスト', category: 'エラー' },
  { name: 'パスミス', category: 'エラー' },
  { name: 'トラップミス', category: 'エラー' },
  { name: '判断ミス', category: 'エラー' },
  { name: '不注意', category: 'エラー' },
  { name: 'デュエル敗北', category: 'エラー' },
  { name: 'GKエラー', category: 'エラー' },
  { name: '決定機逸', category: 'エラー' },
  { name: 'ファウル', category: 'エラー' },
  { name: 'オフサイド', category: 'エラー' },
  { name: 'イエローカード', category: 'エラー' },
  { name: 'レッドカード', category: 'エラー' },
  { name: '消極的', category: 'エラー' },

  // 9. 印象 (Impact)
  { name: 'クレバー', category: '印象' },
  { name: '好判断', category: '印象' },
  { name: 'ハードワーク', category: '印象' },
  { name: '戦術的', category: '印象' },
  { name: '予測', category: '印象' },
  { name: '連携', category: '印象' },
  { name: 'カウンター起点', category: '印象' },
  { name: 'コーチング', category: '印象' },
  { name: '集中力', category: '印象' },
];

export const ACTION_MASTER_SEED: IActionMaster[] =
  ACTION_MASTER_SEED_SOURCE.map(action => ({
    ...action,
    isFavorite: false,
  }));
