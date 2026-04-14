# agent-browser によるブラウザ自動化

## クイックスタート

```bash
agent-browser open <url>        # ページに移動
agent-browser snapshot -i       # 参照（ref）付きでインタラクティブな要素を取得
agent-browser click @e1         # 参照（ref）を指定して要素をクリック
agent-browser fill @e2 "text"   # 参照（ref）を指定して入力欄に入力
agent-browser close             # ブラウザを閉じる
```

## 中核ワークフロー

1. 移動: `agent-browser open <url>`
2. スナップショット: `agent-browser snapshot -i` (`@e1`, `@e2` のような参照（ref）を返します)
3. スナップショットから得られた参照（ref）を使用して対話
4. ナビゲーションや大幅なDOMの変更後は再度スナップショットを取得

## コマンド

### ナビゲーション

```bash
agent-browser open <url>      # URLに移動 (エイリアス: goto, navigate)
                              # サポート: https://, http://, file://, about:, data://
                              # プロトコルがない場合は自動的に https:// を付与
agent-browser back            # 戻る
agent-browser forward         # 進む
agent-browser reload          # 再読み込み
agent-browser close           # ブラウザを閉じる (エイリアス: quit, exit)
agent-browser connect 9222    # CDPポート経由でブラウザに接続
```

### スナップショット (ページ分析)

```bash
agent-browser snapshot            # 完全なアクセシビリティツリー
agent-browser snapshot -i         # インタラクティブな要素のみ (推奨)
agent-browser snapshot -c         # コンパクトな出力
agent-browser snapshot -d 3       # 深度を3に制限
agent-browser snapshot -s "#main" # CSSセレクターでスコープを制限
```

### 対話 (スナップショットの @ref を使用)

```bash
agent-browser click @e1           # クリック
agent-browser dblclick @e1        # ダブルクリック
agent-browser focus @e1           # フォーカス
agent-browser fill @e2 "text"     # 内容をクリアして入力
agent-browser type @e2 "text"     # クリアせず入力
agent-browser press Enter         # キー入力 (エイリアス: key)
agent-browser press Control+a     # キーの組み合わせ
agent-browser keydown Shift       # キーを押し続ける
agent-browser keyup Shift         # キーを離す
agent-browser hover @e1           # ホバー
agent-browser check @e1           # チェックボックスをチェック
agent-browser uncheck @e1         # チェック外す
agent-browser select @e1 "value"  # ドロップダウンを選択
agent-browser select @e1 "a" "b"  # 複数選択
agent-browser scroll down 500     # スクロール (デフォルト: down 300px)
agent-browser scrollintoview @e1  # 要素をビューポート内にスクロール (エイリアス: scrollinto)
agent-browser drag @e1 @e2        # ドラッグ＆ドロップ
agent-browser upload @e1 file.pdf # ファイルアップロード
```

### 情報取得

```bash
agent-browser get text @e1        # 要素のテキスト取得
agent-browser get html @e1        # innerHTML を取得
agent-browser get value @e1       # 入力値を取得
agent-browser get attr @e1 href   # 属性（attribute）を取得
agent-browser get title           # ページタイトル取得
agent-browser get url             # 現在のURL取得
agent-browser get count ".item"   # 一致する要素をカウント
agent-browser get box @e1         # バウンディングボックスを取得
agent-browser get styles @e1      # 計算済みスタイルを取得 (font, color, bg など)
```

### 状態確認

```bash
agent-browser is visible @e1      # 表示されているか確認
agent-browser is enabled @e1      # 有効か確認
agent-browser is checked @e1      # チェックされているか確認
```

### スクリーンショット & PDF

```bash
agent-browser screenshot          # stdoutにスクリーンショット出力
agent-browser screenshot path.png # ファイルに保存
agent-browser screenshot --full   # ページ全体
agent-browser pdf output.pdf      # PDFとして保存
```

### ビデオ録画

```bash
agent-browser record start ./demo.webm    # 録画開始 (現在のURLと状態を使用)
agent-browser click @e1                   # アクション実行
agent-browser record stop                 # 停止して保存
agent-browser record restart ./take2.webm # 現在を停止して新規録画開始
```

録画は新しいコンテキストを作成しますが、セッションのCookie/ストレージは保持されます。URLが提供されない場合は、自動的に現在のページに戻ります。スムーズなデモのために、まず探索してから録画を開始してください。

### 待機

```bash
agent-browser wait @e1                     # 要素を待機
agent-browser wait 2000                    # ミリ秒待機
agent-browser wait --text "Success"        # テキストを待機 (-t)
agent-browser wait --url "**/dashboard"    # URLパターンを待機 (-u)
agent-browser wait --load networkidle      # ネットワークアイドルを待機 (-l)
agent-browser wait --fn "window.ready"     # JS条件を待機 (-f)
```

### マウス制御

```bash
agent-browser mouse move 100 200      # マウス移動
agent-browser mouse down left         # ボタンを押す
agent-browser mouse up left           # ボタンを離す
agent-browser mouse wheel 100         # マウスホイール
```

### セマンティックロケーター (参照以外の代替手段)

```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign In" click
agent-browser find text "Sign In" click --exact      # 完全一致のみ
agent-browser find label "Email" fill "user@test.com"
agent-browser find placeholder "Search" type "query"
agent-browser find alt "Logo" click
agent-browser find title "Close" click
agent-browser find testid "submit-btn" click
agent-browser find first ".item" click
agent-browser find last ".item" click
agent-browser find nth 2 "a" hover
```

### ブラウザ設定

```bash
agent-browser set viewport 1920 1080          # ビューポートサイズ設定
agent-browser set device "iPhone 14"          # デバイスエミュレーション
agent-browser set geo 37.7749 -122.4194       # 位置情報設定 (エイリアス: geolocation)
agent-browser set offline on                  # オフラインモード切替
agent-browser set headers '{"X-Key":"v"}'     # 追加HTTPヘッダー
agent-browser set credentials user pass       # HTTP基本認証 (エイリアス: auth)
agent-browser set media dark                  # カラースキーム（dark）エミュレート
agent-browser set media light reduced-motion  # lightモード + 視覚効果の抑制
```

### Cookie & ストレージ

```bash
agent-browser cookies                     # 全Cookie取得
agent-browser cookies set name value      # Cookie設定
agent-browser cookies clear               # Cookieクリア
agent-browser storage local               # 全localStorage取得
agent-browser storage local key           # 特定キーの取得
agent-browser storage local set k v       # 値の設定
agent-browser storage local clear         # 全クリア
```

### ネットワーク

```bash
agent-browser network route <url>              # リクエストをインターセプト
agent-browser network route <url> --abort      # リクエストをブロック
agent-browser network route <url> --body '{}'  # レスポンスをモック
agent-browser network unroute [url]            # ルート削除
agent-browser network requests                 # 追跡されたリクエストを表示
agent-browser network requests --filter api    # リクエストをフィルタリング
```

### タブ & ウィンドウ

```bash
agent-browser tab                 # タブ一覧
agent-browser tab new [url]       # 新規タブ
agent-browser tab 2               # インデックスでタブ切り替え
agent-browser tab close           # 現在のタブを閉じる
agent-browser tab close 2         # インデックスでタブを閉じる
agent-browser window new          # 新規ウィンドウ
```

### フレーム

```bash
agent-browser frame "#iframe"     # iframeに切り替え
agent-browser frame main          # メインフレームに戻る
```

### ダイアログ (Dialogs)

```bash
agent-browser dialog accept [text]  # ダイアログを承諾
agent-browser dialog dismiss        # ダイアログを破棄
```

### JavaScript

```bash
agent-browser eval "document.title"   # JavaScriptを実行
```

## グローバルオプション

```bash
agent-browser --session <name> ...    # 隔離されたブラウザセッション
agent-browser --json ...              # パース用のJSON出力
agent-browser --headed ...            # ブラウザウィンドウを表示 (headless解除)
agent-browser --full ...              # ページ全体のスクリーンショット (-f)
agent-browser --cdp <port> ...        # CDPポート経由で接続
agent-browser --proxy <url> ...       # プロキシサーバー使用
agent-browser --headers <json> ...    # URLのオリジンにスコープしたHTTPヘッダー
agent-browser --executable-path <p>   # カスタムブラウザの実行パス
agent-browser --extension <path> ...  # ブラウザ拡張機能の読み込み (反復可能)
agent-browser --help                  # ヘルプ表示 (-h)
agent-browser --version               # バージョン表示 (-V)
agent-browser <command> --help        # コマンドの詳細ヘルプ表示
```

### プロキシサポート

```bash
agent-browser --proxy http://proxy.com:8080 open example.com
agent-browser --proxy http://user:pass@proxy.com:8080 open example.com
agent-browser --proxy socks5://proxy.com:1080 open example.com
```

## 環境変数

```bash
AGENT_BROWSER_SESSION="mysession"            # デフォルトセッション名
AGENT_BROWSER_EXECUTABLE_PATH="/path/chrome" # カスタムブラウザパス
AGENT_BROWSER_EXTENSIONS="/ext1,/ext2"       # カンマ区切りの拡張パス
AGENT_BROWSER_STREAM_PORT="9223"             # WebSocketストリーミングポート
AGENT_BROWSER_HOME="/path/to/agent-browser"  # カスタムインストール場所 (daemon.js用)
```

## 例: フォーム送信

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# 出力例: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Submit" [ref=e3]

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # 結果を確認
```

## 例: 保存された状態で認証

```bash
# 一度ログイン
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "username"
agent-browser fill @e2 "password"
agent-browser click @e3
agent-browser wait --url "**/dashboard"
agent-browser state save auth.json

# 次回以降: 保存された状態をロード
agent-browser state load auth.json
agent-browser open https://app.example.com/dashboard
```

## セッション (並列ブラウザ)

```bash
agent-browser --session test1 open site-a.com
agent-browser --session test2 open site-b.com
agent-browser session list
```

## JSON 出力 (パース用)

機械可読な出力には `--json` を追加します：

```bash
agent-browser snapshot -i --json
agent-browser get text @e1 --json
```

## デバッグ

```bash
agent-browser --headed open example.com   # ブラウザウィンドウを表示
agent-browser --cdp 9222 snapshot         # CDPポート経由で接続
agent-browser connect 9222                # 代替手段: connectコマンド
agent-browser console                     # コンソールメッセージを表示
agent-browser console --clear             # クリア
agent-browser errors                      # ページエラーを表示
agent-browser errors --clear              # クリア
agent-browser highlight @e1               # 要素をハイライト
agent-browser trace start                 # トレース記録開始
agent-browser trace stop trace.zip        # 停止してトレース保存
agent-browser record start ./debug.webm   # 現在のページからビデオ録画開始
agent-browser record stop                 # 保存
```

## 詳細ドキュメント

詳細なパターンとベストプラクティスについては、以下を参照してください：

| リファレンス | 説明 |
|-----------|-------------|
| [references/snapshot-refs.md](references/snapshot-refs.md) | 参照のライフサイクル、無効化ルール、トラブルシューティング |
| [references/session-management.md](references/session-management.md) | 並列セッション、状態の永続化、並列スクレイピング |
| [references/authentication.md](references/authentication.md) | ログインフロー、OAuth、2FA対応、状態の再利用 |
| [references/video-recording.md](references/video-recording.md) | デバッグとドキュメント作成用の録画ワークフロー |
| [references/proxy-support.md](references/proxy-support.md) | プロキシ設定、ジオ（位置情報）テスト、プロキシ回転 |

## すぐに使えるテンプレート

共通パターンのための実行可能なワークフロースクリプト：

| テンプレート | 説明 |
|----------|-------------|
| [templates/form-automation.sh](templates/form-automation.sh) | バリデーション付きフォーム入力 |
| [templates/authenticated-session.sh](templates/authenticated-session.sh) | ログインして状態を再利用 |
| [templates/capture-workflow.sh](templates/capture-workflow.sh) | スクリーンショット付きコンテンツ抽出 |

使用方法:
```bash
./templates/form-automation.sh https://example.com/form
./templates/authenticated-session.sh https://app.example.com/login
./templates/capture-workflow.sh https://example.com ./output
```