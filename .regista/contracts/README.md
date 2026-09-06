# Contract Registry

このディレクトリはドメイン間の公開型インターフェースを管理するContract Registryです。

## 目的
GMはソースコードを直接読みません（Pure Orchestration規約）。
Scoutがコードベースから公開型定義を抽出し、このレジストリに保存します。
GMはWorker間のインターフェース整合性を、コードの代わりにこのContractを参照して確認します。

## 命名規則
```
{domain}.json
```

例:
- `tactical-unified.json`
- `data-layer.json`
- `extension-api.json`

## ファイルフォーマット
```json
{
  "domain": "tactical-unified",
  "updated_at": "2026-09-07T00:00:00Z",
  "git_hash": "abc1234",
  "interfaces": [
    {
      "name": "TacticalObject",
      "source_file": "src/features/tactical-unified/types.ts",
      "description": "戦術ボード上の全オブジェクトの基底型",
      "schema": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "type": {"type": "string", "enum": ["player", "arrow", "zone"]},
          "x": {"type": "number"},
          "y": {"type": "number"}
        },
        "required": ["id", "type", "x", "y"]
      }
    }
  ]
}
```

## 更新ルール
- Scoutは探索時に `public_interfaces` を抽出したら、このContractを最新化する義務がある
- GMは新しいチケット発行時に関係ドメインのContractを参照してWorker間の型整合性を確認する
- Workerは実装完了後、自分の変更が既存Contractと矛盾していないことを確認してからWrite-backする
- ContractはLayer 0（GMが常時参照可能）として扱われる

## 現在のドメイン一覧
| Domain | Contract File | 担当エージェント |
|:---|:---|:---|
| tactical-unified | `tactical-unified.json` | regista-canvas / regista-frontend |
| data-layer | `data-layer.json` | regista-data |
| extension-api | `extension-api.json` | regista-extension |
| analysis | `analysis.json` | regista-frontend |
