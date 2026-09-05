# WhoScored Data Specification

## 1. 主要プロパティ (Core Properties)
マッチイベント (`matchCentreData.events`) に含まれる主要なフィールド。
- `id` (BIGINT): グローバル一意なイベントID
- `eventId` (INT): チーム内でシーケンシャルなイベントID
- `type.value` (INT): イベントタイプ (1: Pass, 3: TakeOn, 4: Foul, 7: Tackle, 16: Goal など)
- `outcomeType.value` (INT): 成功(1) / 失敗(0)
- `qualifiers` (ARRAY): 付加情報。`type.value` をIDとして持つオブジェクト配列
- `satisfiedEventsTypes` (ARRAY[INT]): 派生イベントカテゴリ (例: 91: touches)
- `isTouch` (BOOLEAN): ボールタッチを伴うか

## 2. 時間と交代の仕様 (Time & Substitutions)
- `minute` (INT): 試合の0始まりの分（例: 前半ロスタイムでも45のまま）。
- `expandedMinute` (INT): ロスタイムや延長戦を考慮した「連続する分」。シーケンス分析やピッチ上メンバーの特定にはこちらを必ず使用する。
- `second` (INT): `minute` における秒数 (0-59)。

## 3. 特定分におけるピッチ上11人の算出アルゴリズム
特定時間（`expandedMinute`）におけるピッチ上の11人を特定するには、`Team.formations` を使用する。
1. 対象チームの `formations` 配列を取得する。
2. 求めたい時間 `targetMinute` が `startMinuteExpanded <= targetMinute` かつ `targetMinute <= endMinuteExpanded` を満たす `Formation` オブジェクトを探す。
3. 該当する `Formation` の `playerIds` 配列（11人分）が、その時間帯にピッチに立っている選手となる。

## 4. フォーメーションルール
- `Formation.formationId`: (例: "8" は 4-2-3-1 などを指す)。正確な名前はルートレベルの `formationIdNameMappings` を用いてIDから文字列へマッピングする。
- `Player.position`: 'GK', 'DF', 'MID', 'FW', または 'DR', 'MC' などの詳細ポジション、および 'Sub'（ベンチ）。

## 5. ピッチ座標系 (Coordinate System)
- `x`, `y` (FLOAT): イベントの発生座標。
- `endX`, `endY` (FLOAT): パス等の終了座標。
- **単位**: 0.0 から 100.0 までの**パーセンテージ(%)**表記。
- (x=0, y=50) 付近が自陣ゴール、(x=100, y=50) 付近が敵陣ゴール。
- **実距離の計算**: 座標から実際の距離（メートル）を算出する場合、標準的なピッチ寸法（例: 105m x 68m）を掛けてから三平方の定理 (Pythagorean theorem) を適用すること。
