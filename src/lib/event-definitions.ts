export interface EventItem {
  label: string;
  keywords: string[];
}

export interface EventSubGroup {
  name: string;
  events: EventItem[];
}

export interface EventGroup {
  id: string; // "AT", "DF", etc.
  name: string; // "攻撃", "守備", etc.
  color: string; // "#2E5BFF", etc.
  shortcutKey: string; // "1", "2", "3", etc. for Ctrl+1
  subGroups: EventSubGroup[];
}

export const EVENT_GROUPS: EventGroup[] = [
  {
    id: "AT",
    name: "攻撃",
    color: "#2E5BFF",
    shortcutKey: "1",
    subGroups: [
      {
        name: "パス",
        events: [
          { label: "アシスト", keywords: ["a", "as", "asis", "assist"] },
          { label: "キーパス", keywords: ["k", "ki", "kipa", "keypass"] },
          { label: "クロス", keywords: ["c", "ku", "kuro", "cross"] },
          { label: "スルーパス", keywords: ["t", "tu", "suru", "throughpass"] },
          { label: "楔のパス", keywords: ["k", "ku", "kusa", "linebreak"] },
          { label: "サイドチェンジ", keywords: ["s", "sa", "said", "sidechange"] },
          { label: "ショートパス", keywords: ["s", "sh", "shor", "shortpass"] },
          { label: "ロングパス", keywords: ["l", "ro", "rong", "longpass"] },
          { label: "レイオフ", keywords: ["r", "re", "reio", "layoff"] },
          { label: "ライン間へのパス", keywords: ["l", "ra", "rain", "betweenlines"] },
          { label: "プログレッシブパス", keywords: ["p", "pu", "puro", "progressive"] },
          { label: "フリック", keywords: ["f", "fu", "furi", "flick"] }
        ]
      },
      {
        name: "シュート",
        events: [
          { label: "ゴール", keywords: ["g", "go", "goal", "goal"] },
          { label: "ヘディング", keywords: ["h", "he", "hedi", "heading"] },
          { label: "ミドルシュート", keywords: ["m", "mi", "mido", "middleshoot"] },
          { label: "枠内シュート", keywords: ["w", "wa", "waku", "shotontarget"] },
          { label: "枠外シュート", keywords: ["w", "wa", "wake", "shotofftarget"] }
        ]
      },
      {
        name: "キャリー/コントロール",
        events: [
          { label: "ドリブル", keywords: ["d", "do", "dori", "dribble"] },
          { label: "キャリー", keywords: ["c", "ky", "kyar", "carry"] },
          { label: "キープ", keywords: ["k", "ki", "kipu", "keep"] },
          { label: "ターン", keywords: ["t", "ta", "tarn", "turn"] },
          { label: "トラップ", keywords: ["t", "to", "tora", "trap"] },
          { label: "フェイント", keywords: ["f", "fe", "fein", "feint"] },
          { label: "ポストプレー", keywords: ["p", "po", "posu", "postplay"] },
          { label: "プレス回避", keywords: ["p", "pu", "pure", "pressbreaker"] },
          { label: "キャンセル", keywords: ["c", "ky", "kyan", "cancel"] },
          { label: "正対", keywords: ["s", "se", "seit", "facingup"] },
          { label: "押し込み", keywords: ["o", "os", "oshi", "push"] }
        ]
      },
      {
        name: "オフザボール",
        events: [
          { label: "アンダーラップ", keywords: ["u", "an", "anda", "underlap"] },
          { label: "オーバーラップ", keywords: ["o", "ob", "obar", "overlap"] },
          { label: "チェックイン", keywords: ["c", "ch", "chek", "checkin"] },
          { label: "デコイ", keywords: ["d", "de", "deko", "decoy"] },
          { label: "プルアウェイ", keywords: ["p", "pu", "puru", "pullaway"] },
          { label: "裏抜け", keywords: ["u", "ur", "uran", "runbehind"] },
          { label: "3人目の動き", keywords: ["3", "sa", "sann", "thirdman"] },
          { label: "ハーフスペース", keywords: ["h", "ha", "hafu", "halfspace"] },
          { label: "ポケット", keywords: ["p", "po", "poke", "pocket"] },
          { label: "降りる", keywords: ["o", "or", "orir", "drop"] },
          { label: "幅をとる", keywords: ["h", "ha", "haba", "width"] },
          { label: "高さをとる", keywords: ["t", "ta", "taka", "height"] },
          { label: "サイドフロー", keywords: ["s", "si", "said", "drift"] },
          { label: "レーン移動", keywords: ["r", "re", "ren", "lanechange"] },
          { label: "ピン留め", keywords: ["p", "pi", "pind", "pinning"] },
          { label: "ポジショニング(攻撃)", keywords: ["p", "po", "pozi", "pos_att"] },
          { label: "DFラインから距離を取る", keywords: ["d", "df", "hana", "gap"] }
        ]
      }
    ]
  },
  {
    id: "DF",
    name: "守備",
    color: "#FF3B30",
    shortcutKey: "2",
    subGroups: [
      {
        name: "対人・奪取",
        events: [
          { label: "インターセプト", keywords: ["i", "in", "inta", "intercept"] },
          { label: "タックル", keywords: ["t", "ta", "takk", "tackle"] },
          { label: "制限", keywords: ["s", "se", "seig", "limit"] },
          { label: "デュエル(空中戦)", keywords: ["d", "de", "dyue", "duel_air"] },
          { label: "デュエル(地上戦)", keywords: ["d", "de", "dyue", "duel_ground"] },
          { label: "セカンドボール回収", keywords: ["s", "se", "seka", "secondball"] },
          { label: "裏ケア", keywords: ["u", "ur", "urac", "depth"] },
          { label: "カバーリング", keywords: ["c", "ka", "kaba", "cover"] },
          { label: "密着", keywords: ["m", "mi", "mitc", "tight"] },
          { label: "マーク", keywords: ["m", "ma", "maku", "mark"] },
          { label: "ロングボール対応", keywords: ["r", "l", "rong", "longball"] },
          { label: "ハイボール対応", keywords: ["h", "ha", "haib", "highball"] },
          { label: "背走", keywords: ["h", "ha", "hais", "retreat"] }
        ]
      },
      {
        name: "組織・遅延",
        events: [
          { label: "ディレイ", keywords: ["d", "de", "dire", "delay"] },
          { label: "プレス", keywords: ["p", "pu", "pure", "press"] },
          { label: "プレスバック", keywords: ["p", "pu", "pure", "pressback"] },
          { label: "ジョッキー", keywords: ["j", "zy", "zyok", "jockey"] },
          { label: "シュートブロック", keywords: ["s", "sy", "syut", "shotblock"] },
          { label: "クロス対応", keywords: ["c", "ku", "kuro", "crossdef"] },
          { label: "ラインコントロール", keywords: ["l", "ra", "rain", "linecontrol"] },
          { label: "ポジショニング(守備)", keywords: ["p", "po", "pozi", "pos_def"] },
          { label: "横スライド", keywords: ["y", "yo", "yoko", "sliding"] },
          { label: "縦スライド", keywords: ["t", "ta", "tate", "steppingup"] },
          { label: "リトリート", keywords: ["r", "re", "rito", "retreat"] },
          { label: "同サイド圧縮", keywords: ["d", "do", "dous", "overload"] },
          { label: "ミドルブロック", keywords: ["m", "mi", "mido", "midblock"] },
          { label: "ハイプレス", keywords: ["h", "ha", "haip", "highpress"] },
          { label: "ミドルプレス", keywords: ["m", "mi", "mido", "midpress"] },
          { label: "ローブロック", keywords: ["r", "ro", "rob", "lowblock"] },
          { label: "プレストリガー", keywords: ["p", "pu", "pure", "trigger"] },
          { label: "マンマーク", keywords: ["m", "ma", "manm", "manmark"] },
          { label: "ゾーン", keywords: ["z", "zo", "zon", "zone"] },
          { label: "受け渡し", keywords: ["u", "uk", "ukew", "ukewatashi"] }
        ]
      }
    ]
  },
  {
    id: "TR",
    name: "トランジション",
    color: "#FF9500",
    shortcutKey: "3",
    subGroups: [
      {
        name: "切替アクション",
        events: [
          { label: "ネガトラ", keywords: ["n", "ne", "nega", "neg_trans"] },
          { label: "ポジトラ", keywords: ["p", "po", "pozi", "pos_trans"] },
          { label: "カウンタープレス", keywords: ["k", "ka", "kaun", "counterpress"] },
          { label: "ゲーゲンプレス", keywords: ["g", "ge", "gege", "gegenpress"] }
        ]
      }
    ]
  },
  {
    id: "GK",
    name: "GK",
    color: "#28CD41",
    shortcutKey: "4",
    subGroups: [
      {
        name: "アクション",
        events: [
          { label: "キャッチ", keywords: ["c", "ky", "kyat", "catch"] },
          { label: "セーブ", keywords: ["s", "se", "sebu", "save"] },
          { label: "パンチング", keywords: ["p", "pa", "pant", "punching"] },
          { label: "スイーパー", keywords: ["s", "su", "suip", "sweeper"] },
          { label: "ロングキック", keywords: ["l", "ro", "rong", "longkick"] },
          { label: "GKビルド", keywords: ["g", "gk", "gkbi", "gkbuildup"] },
          { label: "GKエラー", keywords: ["e", "er", "era", "gk_error"] }
        ]
      }
    ]
  },
  {
    id: "DE",
    name: "判定",
    color: "#8E8E93",
    shortcutKey: "5",
    subGroups: [
      {
        name: "セットプレー",
        events: [
          { label: "コーナーキック", keywords: ["c", "ko", "kona", "ck"] },
          { label: "フリーキック", keywords: ["f", "fu", "furi", "fk"] },
          { label: "スローイン", keywords: ["s", "su", "suro", "throwin"] },
          { label: "ロングスロー", keywords: ["l", "ro", "rong", "longthrow"] }
        ]
      },
      {
        name: "判定・カード",
        events: [
          { label: "ファウル", keywords: ["f", "fa", "faur", "foul"] },
          { label: "オフサイド", keywords: ["o", "of", "ofus", "offside"] },
          { label: "イエローカード", keywords: ["y", "ie", "iero", "yellow"] },
          { label: "レッドカード", keywords: ["r", "re", "redd", "red"] }
        ]
      },
      {
        name: "ミス全般",
        events: [
          { label: "パスミス", keywords: ["p", "pa", "pasu", "pass_error"] },
          { label: "トラップミス", keywords: ["t", "to", "tora", "trap_error"] },
          { label: "ボールロスト", keywords: ["b", "bo", "boru", "loss"] },
          { label: "判断ミス", keywords: ["h", "ha", "hand", "decision_error"] },
          { label: "決定機ミス", keywords: ["k", "ke", "kett", "miss"] },
          { label: "イージーミス", keywords: ["i", "iz", "izi", "unforcederror"] }
        ]
      }
    ]
  },
  {
    id: "MT",
    name: "メンタル",
    color: "#AF52DE",
    shortcutKey: "6",
    subGroups: [
      {
        name: "認知・スキル",
        events: [
          { label: "スキャン", keywords: ["s", "su", "suky", "scan"] },
          { label: "体の向き", keywords: ["k", "ka", "kara", "bodyshape"] },
          { label: "コーチング", keywords: ["c", "ko", "koti", "coaching"] },
          { label: "集中力", keywords: ["s", "sy", "syuu", "focus"] },
          { label: "予測", keywords: ["y", "yo", "yoso", "predict"] },
          { label: "連携", keywords: ["r", "re", "renk", "link"] },
          { label: "好判断", keywords: ["h", "ko", "kouh", "good_decision"] },
          { label: "戦術的", keywords: ["s", "se", "senz", "tactical"] },
          { label: "クレバー", keywords: ["c", "ku", "kure", "clever"] },
          { label: "ハードワーク", keywords: ["h", "ha", "hado", "hardwork"] },
          { label: "消極的", keywords: ["s", "sy", "syok", "passive"] }
        ]
      }
    ]
  }
];

export interface FlattenedEvent {
  label: string;
  keywords: string[];
  groupCode: string;
  groupName: string;
  groupColor: string;
  subGroupName: string;
  shortcutKey: string;
}

export function getFlattenedEvents(): FlattenedEvent[] {
  const result: FlattenedEvent[] = [];
  for (const group of EVENT_GROUPS) {
    for (const subGroup of group.subGroups) {
      for (const event of subGroup.events) {
        result.push({
          label: event.label,
          keywords: event.keywords,
          groupCode: group.id,
          groupName: group.name,
          groupColor: group.color,
          subGroupName: subGroup.name,
          shortcutKey: group.shortcutKey,
        });
      }
    }
  }
  return result;
}

export function getEventMetadata(label: string): FlattenedEvent | null {
  const flattened = getFlattenedEvents();
  return flattened.find(e => e.label === label) || null;
}
