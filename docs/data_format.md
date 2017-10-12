# Data Format

このドキュメントでは、 `broccoli-html-editor` が編集するデータの形式について説明します。

## ファイル構成

サーバー側インスタンスの初期オプションから、3つのパスを取得します。

- `pathHtml`
    - 出力するHTMLの保存先パスです。
    - `documentRoot` に設定したパスからの相対位置として解釈されます。
- `pathResourceDir`
    - リソースデータ(画像ファイルなど)を格納するディレクトリです。
    - 主に `broccoli.resourceMgr()` がアクセスします。
    - `documentRoot` に設定したパスからの相対位置として解釈されます。
- `realpathDataDir`
    - 構造データを格納します。
    - このディレクトリに格納される構造データは、コンテンツを構成するために必要な全ての情報ソースを含みます。 `pathHtml` や `pathResourceDir` に出力されるファイルは、すべて構造データの記述に基づいて生成されています。
    - 構造データの実体が `<realpathDataDir>/data.json` に保存されます。この1つのJSONファイルに、1つのHTMLコンテンツを構成する全体の情報が格納されています。
    - リソースデータのオリジナルファイルが、 `<realpathDataDir>/resources/*` に保存されます。resourceMgr または 一部のフィールドが、このオリジナルデータを、必要に応じて加工し、 `pathResourceDir` に出力します。


## 構造データ

構造データは、 `realpathDataDir` に設定したディレクトリに格納される `data.json` に含まれます。この1つのJSONファイルに、1つのHTMLコンテンツを構成する全体の情報が格納されています。

`data.json` のもっとも最小の内容は下記のようになります。

```json
{}
```

これは、コンテンツにインスタンスが何も配置されていないことを示しています。

### bowl

まずはじめに、 `bowl` を定義します。 `bowl` は、コンテンツを格納する容れ物のような概念です。 茹でたブロッコリーをお皿に盛り付ける前に一時的に入れておく、あの椀(ボウル)をイメージしてください！

`bowl` は、コンテンツの編集可能エリアに対応します。 それぞれのエリアに名前をつけて、複数のエリアを管理できます。 標準的なコンテンツエリアは `main` という名前で扱われますが、そのほか、例えば 右ナビゲーションエリア `r-navi` とか、コンテンツフッターエリア `contents-footer`、 単に副次的なエリア `sub` など、自由に名前をつけて拡張することができます。

いくつかの `bowl` が定義されている `data.json` は次のように表現されます。

```js
{
    "bowl": {
        "main": {
        },
        "r-navi": {
        },
        "contents-footer": {
        },
        "sub": {
        },
        ・
        ・
        ・
        "anymore": {
        }
    }
}
```

ルートオブジェクト直下の `bowl` は固定キーワードです。
その下に、 `main`, `r-navi`, `contents-footer` ・・・ などが並んでいますが、これが各 `bowl` の名前です。 複数定義できますし、1つだけでも大丈夫です。

ここで決めた名前は、 サーバー側の `bindTemplate` オプションに指定されるコールバックメソッドの第一引数で、オブジェクトのキーとして渡されます。


### モジュールインスタンス

`bowl` の定義ができたら、その中にモジュールインスタンスを定義していきます。 モジュールインスタンスとは、配置されたモジュールにデータを流し込んだ実体データを指してそう呼びます。

ここでは `main` のボウルに絞って、モジュールインスタンスを格納した表現の例を示します。

```js
{
    "bowl": {
        "main": {
            "modId": "_sys/root",
            "fields": {
                "main": [
                ]
            },
            "anchor": "",
            "dec": ""
        }
    }
}
```

`bowl` は、それ自身が1つのモジュールインスタンスの形態をとります。 この形態が、includeフィールドやloopフィールドを介して再帰的にネスとされることで、全体の要素を構成します。

各項目の意味は次の通りです。

- `modId`
    - モジュールのIDを格納します。
    - モジュールIDは通常、 `<packageName>:<categoryName>/<moduleName>` の形式をとります。
    - IDが `_sys/` で始まるモジュールは、 broccoli-html-editor が内部で定義する特殊なモジュールとして予約されたものです。
- `fields`
    - モジュールに含まれるフィールドに流し込まれた値を格納します。
    - モジュールに複数のフィールドが含まれている場合、複数のフィールド値を格納します。
    - `fields` の下のキーは、フィールドの name属性 に指定した文字列で定義されます。そのため、すでに配置したモジュールの name属性 を後から変更した場合、関連付けが途切れて表示できない状態になります。
- `anchor`
    - 編集ウィンドウで入力する anchor の文字列を格納します。
- `dec`
    - 編集ウィンドウで入力する 埋め込みコメント の文字列を格納します。

モジュールインスタンスのルートに当たる `bowl` 自身は、 `_sys/root` というID特殊なモジュールのインスタンスです。

`_sys/root` は、どこかにインストールされている通常のモジュールではないので、実際にはファイルとしては存在していませんが、その実装を示すとすれば次のように表現されます。

```
{&{"module":{"name":"main"}}&}
```

`main` と名付けられた moduleフィールド1つのみから成るモジュールです。 `fields` の下にある `main` というキーによって、 このフィールドの name属性と関連づけられます。


### フィールドの種類とデータ形式

フィールドにはいくつかの種類があり、種類によって格納されるデータの形式が異なります。

ここでは、 moduleフィールド、 loopフィールド、 inputフィールドのそれぞれについてデータの形式を説明します。

#### moduleフィールド

```js
{
    "modId": "package:category/moduleId",
    "fields":{
        "module_sample": [
            { /* ネストされた下位のモジュールインスタンス 1 */ },
            { /* ネストされた下位のモジュールインスタンス 2 */ },
            ・
            ・
            ・
            { /* ネストされた下位のモジュールインスタンス n */ }
        ]
    }
}
```

moduleフィールドは、他のモジュールインスタンスをネストして格納することができるフィールドです。

このため、 moduleフィールドのデータ形式は配列となります。


#### loopフィールド

loopフィールドは、moduleフィールドと同様に、モジュールインスタンスをネストすることができますが、同じフィールドの内に定義された固定のパターン(サブモジュール)の繰り返しのみを許容する点が異なります。

```js
{
    "modId": "package:category/moduleId",
    "fields":{
        "loop_sample": [
            {
                "modId": "package:category/moduleId",
                "fields": {
                    /* ・・・・・・ */
                },
                "subModName": "loop_sample"
            },
            {
                "modId": "package:category/moduleId",
                "fields": {
                    /* ・・・・・・ */
                },
                "subModName": "loop_sample"
            }
        ]
    },
    "anchor": "",
    "dec": ""
}
```

このため、 loopフィールドでは、ネストされた下位モジュールインスタンスのIDが、自身のモジュールIDと同じ値をとります。(上記の例では `package:category/moduleId`)

しかし、これだけではモジュール自身か、サブモジュールか区別ができません。そのため、サブモジュールには、さらに `subModName` 値を持って、自身がサブモジュールであることを記憶します。

`subModName` の値は、親にあたるフィールドの name属性と同じになります。(上記の例では `loop_sample`)


#### inputフィールド

inputフィールドはユーザーの入力値を直接受け取るフィールドです。さらに下位にモジュールをネストすることはできません。

inputフィールドは、type属性の値に応じてインターフェイスの種類を変更できますが、これによって格納されるデータの形式も異なります。

いくつかの例を示します。

##### htmlフィールド, textフィールド, markdownフィールド

これらのもっともシンプルなフィールドは、単一のテキスト入力欄を有するのみです。 従って、データの形式はシンプルにテキスト単体で表現されます。

```json
"入力されたHTMLデータ"
```

##### multitextフィールド

multitextフィールドは、ラジオボタンで入力テキストの表現文法を切り替えることができる機能を持っています。入力する値が2つに増えたので、表現されるデータも構造的です。

```json
{
    "src": "入力された文字データ",
    "editor": "markdown"
}
```

##### imageフィールド

imageフィールドも同様に、複雑なデータ形式を持っています。

imageフィールドはさらに、リソースデータを扱います。リソースデータの実体は `data.json` の内部に格納せず、 リソースデータとして外部化し、 代わりにリソースキーを格納する点が特徴的です。

```json
{
    "resKey": "(リソースキー)",
    "path": "./index_files/resources/resource-name.png",
    "resType": "",
    "webUrl": ""
}
```

##### その他のフィールドの一覧

その他、inputフィールドの種類によって、格納されるデータの形式は様々です。それぞれの仕様について詳しくは下記のウェブページを参照してください。

- [htmlフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/html/)
- [textフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/text/)
- [markdownフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/markdown/)
- [multitextフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/multitext/)
- [imageフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/image/)
- [tableフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/table/)
- [html_attr_textフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/html_attr_text/)
- [hrefフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/href/)
- [selectフィールド](http://pickles2.pxt.jp/manual/guieditor/fields/select/)


## リソースデータ

リソースデータは、フィールドのインターフェイスを通じてユーザーが入力するファイルを指します。 主に、画像ファイルや表形式のファイルなど文字列表現が困難なファイルフォーマット、特にファイルサイズが大きくなりがちなものを取り扱うことが多くなるでしょう。

このような情報は、 `data.json` 内に直接格納せず、 リソースデータとして別の領域に保存されます。

リソースは、フィールドによって加工してから利用される場合(例: 写真を白黒処理する、PNGデータを軽量化する、SVGデータを画像化するなど)が想定されるため、加工前のオリジナルデータを保持するように設計されています。 また、容量の大きなデータが通信領域を通過する機会を減らすなど、パフォーマンス向上のためにも `data.json` から分離して管理されるべきです。


### 格納ディレクトリ

ユーザーが指定したリソースのオリジナルファイルは、次のディレクトリに格納されます。

- `<realpathDataDir>/resources/{$resourceKey}/*`

リソースは、1コンテツにつき複数保存でき、リソースキー (`{$resourceKey}`)で関連づけて出し入れされます。

各リソースごとのディレクトリには、次のファイルを格納します。

- `bin.ext`
    - ユーザーが入力したオリジナルファイルの実体の複製を格納します。
    - 拡張子は、ユーザーが入力したオリジナルと同じになります。 例えば、 `hoge.jpg` が入力されれば、 `bin.jpg` という名前になります。
- `res.json`
    - 入力されたデータの詳しい情報を記録します。


### `res.json` のデータ構造

下記に、 `res.json` のデータの格納例を示します。

```json
{
 "ext": "svg",
 "type": "image/svg+xml",
 "base64": "・・・",
 "publicFilename": "",
 "isPrivateMaterial": false,
 "size": "2709",
 "md5": "d4d1013b65be7689de72285d938955a3",
 "field": "image",
 "fieldNote": {
  "origMd5": "d4d1013b65be7689de72285d938955a3",
  "md5": "d4d1013b65be7689de72285d938955a3",
  "size": 2709,
  "base64": "・・・"
 }
}
```

それぞれの値について説明します。

- `ext`
    - オリジナルファイルの拡張子を記憶します。
- `type`
    - オリジナルファイルのmimeタイプを記憶します。
- `base64`
    - オリジナルファイルのbase64エンコードされた文字列を格納します。
- `publicFilename`
    - 公開されるファイル名を格納します。この値に、`.` 区切りで `ext` を結合した名前が、実際のファイルに命名されます。
- `isPrivateMaterial`
    - このファイルを公開するか設定します。 `true` のとき、リソースは、公開領域 `pathResourceDir` に設定したパスへコピーされます。 `false` の場合、オリジナルファイルは保持しますが、公開領域に設置されません。
- `size`
    - オリジナルファイルのファイルサイズを記憶します。
- `md5`
    - オリジナルファイルのMD5ハッシュ値を記憶します。
- `field`
    - このリソースを登録したフィールドの種類を記憶します。
- `fieldNote`
    - その他、フィールドが付加的に扱いたい値を記憶する領域です。この仕様については、呼び出し元のフィールドの仕様を参照してください。


## 出力ファイル

`broccoli-html-editor` は、ビルド処理の成果物として以下のファイルを出力します。

- HTMLファイル本体
    - `pathHtml` に設定されたパスにHTMLファイルを保存します。
- 加工処理後のリソースファイル
    - `pathResourceDir` に設定されたパスにリソースファイルを保存します。

これらのファイルは、ビルドのたびに 構造データ(`data.json` とリソースデータ) から完全に再生性されます。出力ファイルを直接編集した場合、その内容は次回のビルド時に失われてしまいます。