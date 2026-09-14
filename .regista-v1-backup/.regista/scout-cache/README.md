# Scout Cache

このディレクトリは `regista-scout` が探索結果を永続化するキャッシュストアです。

## 命名規則
```
{domain}-{git-hash}.json
```

例:
- `tactical-unified-abc1234.json`
- `data-layer-def5678.json`
- `extension-ghi9012.json`

## 有効期限
キャッシュはgit hashで管理されます。コードが変更されてgit hashが変わると、
そのキャッシュは自動的に「無効」となり、Scoutが再探索を実施します。

## ファイルフォーマット
```json
{
  "cache_key": "tactical-unified-abc1234",
  "domain": "tactical-unified",
  "git_hash": "abc1234",
  "created_at": "2026-09-07T00:00:00Z",
  "impacted_files": ["path/to/file1", "path/to/file2"],
  "dag_dependencies": [
    {"file": "file1", "depends_on": []},
    {"file": "file2", "depends_on": ["file1"]}
  ],
  "public_interfaces": [
    {
      "name": "TacticalObject",
      "file": "src/features/tactical-unified/types.ts",
      "definition": "type TacticalObject = {...}"
    }
  ],
  "summary": "探索結果の1-2行要約"
}
```

## 管理ルール
- Scoutは探索完了後、必ずこのディレクトリにキャッシュを保存してからGMへ報告する
- GMは Scout起動前にキャッシュの存在を確認し、有効なキャッシュがあればScout起動をスキップする
- 古いキャッシュファイルは定期的に削除してよい（同一ドメインの古いhashファイル）
