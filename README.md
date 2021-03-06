# broccoli-html-editor

_broccoli-html-editor_ は、GUIベースのHTMLエディタライブラリです。
断片化されたHTMLの部品(モジュール)をドラッグ＆ドロップ操作で組み合わせて、ウェブページを構成できます。

## インストール - Install

```
$ composer require broccoli-html-editor/broccoli-html-editor
```


## 使い方 - Usage

### サーバー側 - Server side (PHP)

`/path/to/broccoli_api.php` にAPIを設置する例です。

```php
<?php
require_once('path/to/vendor/autoload.php');

$broccoli = new broccoliHtmlEditor\broccoliHtmlEditor();
$broccoli->init(
    array(
        'appMode' => 'web', // 'web' or 'desktop'. default to 'web'
        'paths_module_template' => array(
            'testMod1' => '/realpath/to/modules1/' ,
            'testMod2' => '/realpath/to/modules2/'
        ) ,
        'documentRoot' => '/realpath/to/www/htdocs/', // realpath
        'pathHtml' => '/path/to/your_preview.html',
        'pathResourceDir' => '/path/to/your_preview_files/resources/',
        'realpathDataDir' => '/realpath/to/www/htdocs/path/to/your_preview_files/guieditor.ignore/',
        'customFields' => array(
            // カスタムフィールドを実装します。
            // このクラスは、 `broccoliHtmlEditor\\fieldBase` を基底クラスとして継承します。
            // customFields のキー(ここでは custom1)が、フィールドの名称になります。
            'custom1' => 'broccoli_class\\field_custom1'
        ) ,
        'fieldConfig' => array(
            'image' => array( // image field に対する設定
                'filenameAutoSetter' => 'ifEmpty', // filenameAutoSetterの初期値を設定
            ),
        ),
        'bindTemplate' => function($htmls){
            $fin = '';
            $fin .= '<!DOCTYPE html>'."\n";
            $fin .= '<html>'."\n";
            $fin .= '    <head>'."\n";
            $fin .= '        <title>sample page</title>'."\n";
            $fin .= '    </head>'."\n";
            $fin .= '    <body>'."\n";
            $fin .= '        <div data-contents="main">'."\n";
            $fin .= $htmls['main']."\n";
            $fin .= '        </div><!-- /main -->'."\n";
            $fin .= '        <div data-contents="secondly">'."\n";
            $fin .= $htmls['secondly']."\n";
            $fin .= '        </div><!-- /secondly -->'."\n";
            $fin .= '    </body>'."\n";
            $fin .= '</html>';

            return $fin;
        },
        'log' => function($msg){
            // エラー発生時にコールされます。
            // msg を受け取り、適切なファイルへ出力するように実装してください。
            error_log('[ERROR HANDLED]'.$msg, 3, '/path/to/error.log');
        },
        'userStorage' => function($key, $val = null){
            // ユーザー固有の情報を読み書きします。
            $args = func_get_args();
            if( count($args) == 1 ){
                // 読み取りとしてコールされる場合、引数が1つだけ提供されます。
                return file_get_contents('/path/to/userdir/'.urlencode($key).'.json');
            }else{
                // 書き込みの要求の場合、引数が2つ提供されます。
                return file_put_contents('/path/to/userdir/'.urlencode($key).'.json', $val);
            }
        }
    )
);


$rtn = $broccoli->gpi(
    $_REQUEST['api'],
    json_decode($_REQUEST['options'], true)
);
echo json_encode($rtn);
exit;
```

APIの一覧は[こちらを参照](docs/api_server.md)ください。

#### PHPの要件

- PHP 5.4 以上
  - [mbstring](https://www.php.net/manual/ja/book.mbstring.php) PHP Extension
  - [JSON](https://www.php.net/manual/ja/book.json.php) PHP Extension

モジュールやカスタムフィールドなど他のパッケージとの構成によって、いくつかの要件が追加される場合があります。
依存パッケージのシステム要件も確認してください。



### クライアント側 - Client side JavaScript

```html
<div id="canvas" data-broccoli-preview="http://127.0.0.1:8081/path/to/your_preview.html"></div>
<div id="palette"></div>
<div id="instanceTreeView"></div>
<div id="instancePathView"></div>

<!-- jQuery -->
<script src="/path/to/jquery/jquery.js"></script><!-- <- option; not required -->

<!-- broccoli -->
<script src="/path/to/broccoli-html-editor/broccoli.min.js"></script>
<script>
var broccoli = new Broccoli();
broccoli.init(
    {
        'elmCanvas': document.getElementById('canvas'),
        'elmModulePalette': document.getElementById('palette'),
        'elmInstanceTreeView': document.getElementById('instanceTreeView'),
        'elmInstancePathView': document.getElementById('instancePathView'),
        'lang': 'en', // language
        'contents_area_selector': '[data-contents]',
            // ↑編集可能領域を探すためのクエリを設定します。
            // 　この例では、data-contents属性が付いている要素が編集可能領域として認識されます。
        'contents_bowl_name_by': 'data-contents',
            // ↑bowlの名称を、data-contents属性値から取得します。
        'customFields': {
            'custom1': function(broccoli){
                // カスタムフィールドを実装します。
                // この関数は、fieldBase.js を基底クラスとして継承します。
                // customFields オブジェクトのキー(ここでは custom1)が、フィールドの名称になります。
            }
        },
        'customValidationRules': {
            'customValidation1': function(value, req, attribute, passes) {
                // カスタムバリデーションを定義します。
                // フィールドの validate に登録して呼び出すことができます。
                var ok = true;
                if( ok ){
                    passes(); // if available
                }else{
                    passes(false, 'The '+attribute+' is not valid.'); // if not available
                }
            }
        },
        'gpiBridge': function(api, options, callback){
            // GPI(General Purpose Interface) Bridge
            // broccoliは、バックグラウンドで様々なデータ通信を行います。
            // GPIは、これらのデータ通信を行うための汎用的なAPIです。
            $.ajax({
                "url": "/path/to/broccoli_api.php",
                "type": 'post',
                'data': {
                    'api': api ,
                    'options': JSON.stringify(options)
                },
                "success": function(data){
                    callback(data);
                }
            });
            return;
        },
        'clipboard': {
            // クリップボード操作の機能を拡張できます。
            // 通常のクリップボード処理では対応できない特殊な環境で利用する場合に拡張してください。
            // 省略した場合は、Broccoliの標準的な処理が適用されます。
            'set': function( data, type, event, callback ){
                // クリップボードにコピーする機能を実装してください。
            },
            'get': function( type, event, callback ){
                // クリップボードからデータを取得する機能を実装してください。
            }
        },
        'droppedFileOperator': {
            // ローカルディスクから直接ファイルがドロップされた場合の処理を拡張します。
            // mimetype毎に加工処理を設定できます。
            // 省略した場合は、Broccoliの標準的な処理が適用されます。
            'text/example': function(fileInfo, callback){
                var clipContents = {
                    'data': {},
                    'resources': {}
                };

                // クリップモジュールと同様の形式のオブジェクトを生成して
                // コールバックへ返却してください。
                callback(clipContents);
                return;
            }
        },
        'onClickContentsLink': function( uri, data ){
            // コンテンツ内のリンクをクリックした場合のイベントハンドラを登録できます。
            alert(uri + ' へ移動');
            console.log(data);
            return false;
        },
        'onMessage': function( message ){
            // ユーザーへ知らせるメッセージを表示します。
            // 組み込む先でお使いのフレームワークや環境に応じて、
            // 適切なメッセージ機能へ転送してください。
            yourOunCustomMessageMethod( message );
        },
        'enableModuleAnchor': true, // モジュールごとのid属性入力の有効/無効 (デフォルトは `true`)
        'enableModuleDec': true // DEC入力の有効/無効 (デフォルトは `true`)
    } ,
    function(){
        // 初期化が完了すると呼びだされるコールバック関数です。

        $(window).on('resize', function(){
            // このメソッドは、canvasの再描画を行います。
            // ウィンドウサイズが変更された際に、UIを再描画するよう命令しています。
            broccoli.redraw();
        });

    }
);
</script>
```

### プレビュー用ウェブサーバー - Web Server for preview

編集画面上のプレビューHTMLの最後に、次のスクリプトコードを埋め込んでください。
`'http://127.0.0.1:8080'` の箇所には、`broccoli-html-editor` の編集画面が置かれるサーバーの `origin` を設定してください。

```html
<script data-broccoli-receive-message="yes">
window.addEventListener('message',(function() {
return function f(event) {
if(!event.data.scriptUrl){return;}
if(event.origin!='http://127.0.0.1:8080'){return;}// <- check your own server's origin.
var s=document.createElement('script');
document.querySelector('body').appendChild(s);s.src=event.data.scriptUrl;
window.removeEventListener('message', f, false);
}
})(),false);
</script>
```

APIの一覧は[こちらを参照](docs/api_client.md)ください。



## モジュールの開発 - developing HTML module

coming soon.


## カスタムフィールドの開発 - developing custom field

サーバー側、クライアント側 ともに、オプション `customFields[fieldName]` に定義します。

このメソッドは、サーバーサイドは `broccoliHtmlEditor\fieldBase` を、クライアントサイドは `client/src/apis/fieldBase.js` を、基底クラスとして継承します。

- server side
    - bind($fieldData, $mode, $mod) - データをバインドする
    - resourceProcessor($path_orig, $path_public, $resInfo) - リソースを加工する
    - gpi($options) - GPI
- client side
    - normalizeData(fieldData, mode) - データを正規化する
    - mkPreviewHtml(fieldData, mod, callback) - プレビュー用の簡易なHTMLを生成する
    - mkEditor(mod, data, elm, callback) - エディタUIを生成
    - focus(elm, callback) - エディタUIにフォーカス
    - duplicateData(data, callback) - データを複製する
    - extractResourceId(data, callback) - データから使用するリソースのリソースIDを抽出する
    - validateEditorContent(elm, data, mod, callback) - エディタUIで編集した内容を検証する
    - saveEditorContent(elm, data, mod, callback, options) - エディタUIで編集した内容を保存
    - callGpi(options, callback) - GPIを呼び出す


## プラグインの種類と `broccoli.json`

`broccoli-html-editor` のプラグインには、 _モジュール_ と _フィールド_ があります。
アプリケーションがこれらのパッケージを効率的に利用するため、 各パッケージのルートディレクトリに `broccoli.json` を配置し、パッケージに関する情報を記述します。

### モジュール の例

```json
{
    "id": "foo-bar-elements",
    "name": "Foo Bar Elements",
    "type": "module",
    "path": "path/to/modules/"
}
```

### フィールド の例

```json
{
    "id": "foo-bar-field",
    "name": "Foo Bar Field",
    "type": "field",
    "backend": {
        "class": "myNamespace\\myClassName"
    },
    "frontend": {
        "file" : "path/to/dist/broccoli-field-foobar.js",
        "function" : "window.BroccoliFieldFooBar"
    }
}
```


## データフォーマット

[Data Format](docs/data_format.md) を参照してください。


## for developer

### build

```
$ gulp
```

### build with watching edit change

```
$ gulp watch
```

### server up

#### node.js

```
$ npm start
```

#### PHP

```
$ composer start
```

### test

#### node.js

```
$ npm test
```

#### PHP

```
$ composer test
```


## 更新履歴 - Change log

### broccoli-html-editor v0.4.4 (2021年7月10日)

- UIの改善: アペンダーの表示量を調整した。一番浅い階層だけは、内容がセットされていても常に表示されるようになった。
- Twigテンプレートで作成したモジュールで、 `_ENV.lang` と `_ENV.data` を利用できるようになった。
- UI改善: 編集ウィンドウを閉じるときのフォームの振る舞いを改善した。
- その他、細かい不具合の修正。

### broccoli-html-editor v0.4.3 (2021年6月26日)

- UIの改善: アペンダーの表示量を少なくした。
- ブランクのコンテンツから制作を始めたときに起きる不具合を修正。
- 内部エラー処理に関する修正。

### broccoli-html-editor v0.4.2 (2021年5月25日)

- 画像ファイルを直接ドロップしたあとに起きるスクリプトエラーを修正。

### broccoli-html-editor v0.4.1 (2021年4月23日)

- `scssphp/scssphp` への対応を追加。
- 内部コードの細かい修正。

### broccoli-html-editor v0.4.0 (2021年2月6日)

- モジュールのマルチ言語化に対応した。
- あとからモジュールに追加した moduleフィールド または loopフィールドがある場合に、編集ウィンドウで起きる不具合を修正。
- 各フィールド間のデータの互換性が向上した。直接文字列でデータを格納していた `html`, `text`, `markdown`, `html_attr_text`, `href`, `select`, `datetime`, `color` の各フィールドが、`multitext` に合わせて `{"src": src}` の型で格納するように変更された。(読み込みについては旧来の文字列の形式との互換性が維持される)
- `color` フィールドが、 インスタンスツリービュー上でカラーチップで確認できるようになった。
- 内部コードの細かい修正。

### broccoli-html-editor v0.3.21 (2020年12月15日)

- imageフィールドが、画像の入力がない場合に、空白の文字を返すようになった。

### broccoli-html-editor v0.3.20 (2020年12月10日)

- HTMLパーサーが 600MB までの大きいソースを解析できるようにした。
- 一度 `fields` が空白になった階層に、新しいモジュールを入れようとすると反映されなくなる場合がある問題を修正。

### broccoli-html-editor v0.3.19 (2020年8月12日)

- 画面表示要素の呼称統一などの細かい改善。
- Aceエディタの高さが、内容量に合わせて自動的に広がるようにした。
- モジュールとのリンクが失われたインスタンスに、 `data-broccoli-error-message` 属性を付与するようになった。
- その他、細かい不具合の修正。

### broccoli-html-editor v0.3.18 (2020年6月21日)

- 初期化処理の改善。
- 画像ファイルや、JSONファイル化されたクリップモジュールを、直接ドロップできるようになった。
- モジュールパレットの開閉状態を記憶できるようになった。
- インスタンスを複数選択した状態でドラッグ＆ドロップ操作ができるようになった。
- まとめて複数段階の 戻る や 進む ができるようになった。
- バックエンドの新しい設定項目 `fieldConfig` を追加。フィールド毎のデフォルトの挙動を設定できるようになった。
- バックエンドの新しい設定項目 `userStorage` を追加。ユーザー固有の情報を読み書きするインターフェイスを指定できるようになった。
- フロントエンドの新しい設定項目 `droppedFileOperator` を追加。
- `color` フィールドのUIを改善。カラーピッカーライブラリ `Pickr` を導入した。
- 削除したリソースファイルをもう一度アップロードするときにファイル名の重複エラーが起きる問題を修正。
- 編集履歴の操作(戻る、やりなおし)をしたときに、画像が消えてしまう不具合を修正。
- 編集履歴の件数に上限を追加し、30件 に設定した。
- 変更されていない imageフィールドで、ファイル名の重複チェックを省くようになった。
- その他、パフォーマンスの改善と、細かい不具合の修正。

### broccoli-html-editor v0.3.17 (2020年5月10日)

- 新しい設定項目 `enableModuleAnchor` を追加。(デフォルトは `true`)
- 新しい設定項目 `enableModuleDec` を追加。(デフォルトは `true`)
- 編集ウィンドウ上のタブキー制御の改善。
- クリップモジュールアイコンを画像化した。
- `image` フィールドが、オリジナル画像の複製を保持しないようになった。
- Twigテンプレートの定義で、 `fieldType` を省略できるようになった。省略した場合は、 `input` として扱われる。
- Twigテンプレートでは、フィールドオプションの `hidden` を無視するようになった。(テンプレートの記述上で隠すことができるため)
- モジュールの `info.json` に、新しい項目 `id` を追加。 `id` を指定しておけば、データの関連付けを壊さずにカテゴリを移動できる。
- その他、パフォーマンスの改善と、細かい不具合の修正。

### broccoli-html-editor v0.3.16 (2020年4月4日)

- 新しいフィールド `color`、 `datetime` を追加。
- ace editor 適用時に、日本語変換中のテキストが画面上で確認しにくい問題を修正。
- `image` フィールドに、バリデーション `required`、`min-height`、`max-height`、`min-width`、`max-width`、`min-filesize`、`max-filesize` を追加。
- `image` フィールドで、画像ファイル名のあとに拡張子を表示するようになった。
- `image` フィールドで、画像ファイル名に含まれる 英数字、ハイフン、アンダースコア、ドット以外の文字が、初回の自動セット時にアンダースコアに置き換えられるようになった。
- `image` フィールドに、 `filenameAutoSetter` オプションを追加。
- `data.json` 上のフィールドデータが空白の場合に上書きできなくなることがある問題を修正。
- 編集ウィンドウ上の `module`フィールドと `loop`フィールドの編集欄に、子要素の大まかな内容を伝えるプレビューを表示するようになった。
- Twigテンプレートで作成したモジュールで、 loopフィールドサブモジュール内のmoduleフィールドに他のモジュールを入れられな不具合を修正。
- Twigテンプレートで作成したモジュールで、 `_ENV.vars` を利用できるようになった。

### broccoli-html-editor v0.3.15 (2020年3月14日)

- `script` フィールドに `escape` オプションを追加。
- Twigテンプレートで `loopitem_start($fieldName)`、 `loopitem_end()`、 `appender($fieldName)` を使えるようになり、Twigテンプレートでも loopフィールドのアペンダーを利用できるようになった。
- 各フィールドのオプション `validate` を追加。 npmパッケージ `validatorjs` のバリデーション機能が統合された。
- クライアントサイドに `customValidationRules` オプションを追加。
- 編集ウィンドウ内に、モジュールのREADMEを表示する機能を追加。
- モジュールのREADME内で画像を参照できるようになった。
- GPIから CSS と JS をビルドできるようになった。
- その他の細かい修正。

### broccoli-html-editor v0.3.14 (2020年2月24日)

- Google Chrome でドラッグ・アンド・ドロップ操作ができない場合がある問題について一時的な修正対応。
- 細かい不具合の修正。

### broccoli-html-editor v0.3.13 (2020年1月14日)

- インスタンスの中央より下の座標にドロップすると、後ろに挿入されるようになった。
- フィールドによって、編集結果を保存できない場合がある不具合を修正。

### broccoli-html-editor v0.3.12 (2020年1月2日)

- PHP 7.4 に対応した。
- Twig 3 に対応した。

### broccoli-html-editor v0.3.11 (2019年11月16日)

- ドラッグ＆ドロップでインスタンスを移動したあとに、選択の状態が不自然な挙動になる場合がある問題を修正。
- その他の細かい不具合の修正。

### broccoli-html-editor v0.3.10 (2019年9月4日)

- PHP 7.3 で発生する不具合を修正。
- タッチ端末での操作性を改善。
- プレビューの読み込みに 30秒以上かかる場合、タイムアウトを発生させて強制的に編集画面へ移行するようになった。
- コピー・アンド・ペースト操作に関する問題の修正。
- その他いくつかのUI改善。

### broccoli-html-editor v0.3.9 (2019年8月11日)

- 1つのモジュール内で画像リソースを繰り返し呼び出す場合に、2回目以降の画像がプレビューされない不具合を修正。
- `image` フィールドに、画像を挿入しない「なし」という選択肢を追加。
- タッチ端末でのスクロールに関する問題を修正。

### broccoli-html-editor v0.3.8 (2019年6月20日)

- `default` が設定されている `loop` フィールド内のフィールドの変更内容が同期してしまうことがある不具合を修正。
- 編集ウィンドウ上部のモジュールの階層構造表示の改善。遷移前に編集内容を保存するようになった。

### broccoli-html-editor v0.3.7 (2019年6月8日)

- 編集ウィンドウで、入力エラーがある場合のエラーメッセージ表示を改善。
- imageフィールドで、画像を選択していない場合に、画像ではないパスが出力される問題を修正し、空白文字列となるようになった。
- 編集ウィンドウの上部に、モジュールの階層構造を表示するようになった。
- その他、細かい不具合の修正。

### broccoli-html-editor v0.3.6 (2019年4月19日)

- コンテキストメニューからコピーや削除などの操作をできるようになった。
- ESCキーでモーダルウィンドウを閉じるようになった。
- loopフィールドの外側に宣言されたinputフィールドの値を、 loopフィールド内の echoフィールドで参照できるようになった。
- loopフィールドに indexオプションを追加。
- inputフィールドに scriptフィールドを追加。
- 出力されるHTMLにPHP構文が含まれる場合に、編集画面上でこれを無害化するようになった。
- `display:none` が適用されている要素が画面を覆ってしまうことがある問題を修正。
- その他、細かい不具合の修正とUI改善。

### broccoli-html-editor v0.3.5 (2018年8月25日)

- 初期起動時のパフォーマンスを向上した。
- NodeJS版で、モジュールの info.json の内容が null だった場合に異常終了する不具合を修正。

### broccoli-html-editor v0.3.4 (2018年8月8日)

- 細かい不具合の修正。

### broccoli-html-editor v0.3.3 (2018年7月30日)

- info.json が破損している場合に起きるエラーを修正。
- その他いくつかの不具合の修正。

### broccoli-html-editor v0.3.2 (2018年7月27日)

- PHP版に関するいくつかの不具合の修正。

### broccoli-html-editor v0.3.1 (2018年7月11日)

- PHP版に関するいくつかの不具合の修正。

### broccoli-html-editor v0.3.0 (2018年6月15日)

- if フィールドが、 canvas モード描画時でも常に finalize モードで出力された値を評価するように変更した。
- バックエンド処理をPHPに移行した。これに伴い、 `finalize.js` は `finalize.php` へ変更され、フィールドプラグインのバックエンド処理もPHPへ移行する。

### broccoli-html-editor v0.2.0 (2018年3月5日)

- クライアントサイドに `clipboard.set()`, `clipboard.get()` オプションを追加。
- インスタンス編集後の保存時に、処理の進捗状況を伝えるようになった。
- imageフィールドがファイル名の重複をチェックするようになった。
- imageフィールドの JPEG, PNG 画像の自動ロスレス圧縮機能を削除。圧縮に著しく時間がかかり、作業効率を下げるため。
- moduleフィールド、 loopフィールドに `maxLength` を追加。
- moduleフィールドに `enabledChildren` を、モジュールの `info.json` 仕様に `enabledParents`, `enabledBowls` を追加。親子関係の定義ができるようになった。
- 画像等のリソースが増えるとUIが重くなるパフォーマンス上の問題を改善。
- finalize.js の第3引数 `supply` に `data` を追加。モジュールに入力されたデータ構造にアクセスできるようになった。
- `elseif`、 `else` フィールドを追加。
- その他幾つかの細かい修正。

### broccoli-html-editor v0.1.0 (2017年4月20日)

- Node.js 0.x , io.js のサポートを中止。
- `broccoli.buildModuleCss()` が、SASSが使えない環境で異常終了する問題を修正。
- モジュールにscriptタグが含まれる場合に、編集画面では無効にするようになった。
- editWindow 内の moduleフィールドに「モジュールパレットから追加」ができるようになった。
- インスタンスのカット機能追加。
- インスタンスの範囲選択機能追加。
- その他幾つかの細かい修正。

### broccoli-html-editor v0.1.0-beta.11 (2017年1月18日)

- モジュール設定 `deprecated` を追加。非推奨のモジュールに `true` をセットすると、モジュールパレットに表示されなくなる。
- サーバーサイドに新しいAPI `broccoli.updateContents()` を追加。
- クライアントサイドの新しいフィールドAPI `validateEditorContent()` を追加。
- クライアントサイドの新しいオプション `lang` を追加。
- imageフィールドに、JPEG, PNG 画像の自動ロスレス圧縮機能を追加。
- imageフィールドに、ウェブ上のURLを直接参照できる機能を追加。
- imageフィールドに、クリップボード上の画像をペーストできる機能を追加。
- 既に使用されたモジュールに、後から selectフィールドを追加した場合に、 `default` が適用されない不具合を修正。
- モジュールの package, category にも `deprecated` フラグを追加。
- moduleフィールド、 loopフィールド でも `hidden`, ifフィールドでの分岐, echoフィールドからの出力 ができるようになった。
- buildCss() が、モジュールのCSSに含まれる `url()` を base64 に置き換えてビルドするようになった。
- finalize.js の第3引数に、ライブラリやリソースを供給する `supply` を追加。この中に含まれる `cheerio` を利用できるようになった。
- ライトボックス表示中のtabキーによるフォーカス操作を改善。ライトボックス以外の領域にフォーカスしないようにした。
- モジュールの `info.json` や `clip.json` がキャッシュされ、更新が反映されない場合がある問題を修正。
- モジュールテンプレート中の `{& ~~~~ &}` のあとに改行が続く場合、1つだけ削除するようになった。(テンプレートコードの可読性向上のため)
- CSS, JS のビルド結果を整形した。
- その他幾つかの細かい修正。

### broccoli-html-editor v0.1.0-beta.10 (2016年8月3日)

- selectフィールドに、オプション `"display": "radio"` を追加。ラジオボタン形式の入力欄を作成できるようになった。
- editWindow上 の loop appender をダブルクリック操作した後に表示が更新されない問題を修正。
- Ace Editor が有効な場合、同じ種類のフィールドが1つのモジュールに並んでいる場合に、最後の値がすべてに適用されてしまう不具合を修正。
- コピー＆ペースト操作時に、誤った操作ができてしまう不具合を修正。
- データ上のエラーで、誤ったモジュールが混入した場合に異常終了しないように修正。
- その他幾つかの細かい修正。

### broccoli-html-editor v0.1.0-beta.9 (2016年6月8日)

- editWindow 上で、moduleフィールドとloopフィールドの並べ替えができるようになった。
- Ace Editor を自然改行されるように設定した。
- Ace Editor で、書式に応じてテーマが変わるようにした。
- Ace Editor の文字サイズを最適化。
- 編集保存中のアニメーション追加。


### broccoli-html-editor v0.1.0-beta.8 (2016年4月27日)

- 埋め込み Ace Editor に対応。
- 1行のフィールドを textarea ではなく input[type=text] に変更。
- ドラッグ＆ドロップ操作が Firefox に対応した。
- loopモジュール内にモジュールが入る場合のデータが扱えない問題を修正。
- `postMessage()` に関する不具合を修正。


### broccoli-html-editor v0.1.0-beta.7 (2016年4月15日)

- imageフィールドに、ローカルディスク上の画像ファイルをドラッグ＆ドロップで登録できるようになった。
- imageフィールドが、画像のURL指定で登録できるようになった。
- moduleフィールドとloopフィールドの内容をリスト表示するようになった。
- サーバー側設定に appMode を追加
- appender に mouseover, mouseout したときの不自然な挙動を修正
- bootstrap アイコン を使用
- editWindow: アンカーのinputの前に # の表示をつけた
- コンテンツで html,body が height:100%; になっているときにプレビュー画面の高さ設定に失敗する問題を修正
- CSS調整: モジュールの README.md

### broccoli-html-editor v0.1.0-beta.6 (2016年3月23日)

- 編集エリアが無駄に縦に長くなる問題を修正
- instancePathView のレイアウト調整
- modulePalette のフィルター機能の振る舞いを改善
- appenderを選択できるようにした。
- panelクリックでinstanceTreeViewをフォーカスするようにした。
- bowl操作の制御調整
- instanceTreeView の bowl のデザイン修正

### broccoli-html-editor v0.1.0-beta.4 (2016年3月8日)

- リソース情報を含むコピー＆ペーストが可能になった。
- クリップモジュール機能を追加。


## ライセンス - License

MIT License


## 作者 - Author

- Tomoya Koyanagi <tomk79@gmail.com>
- website: <https://www.pxt.jp/>
- Twitter: @tomk79 <https://twitter.com/tomk79/>
