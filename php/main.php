<?php
/**
 * broccoli-html-editor
 */
namespace broccoliHtmlEditor;

/**
 * broccoli-html-editor core class
 *
 * @author Tomoya Koyanagi <tomk79@gmail.com>
 */
class broccoliHtmlEditor{

	/** 設定情報 */
	public	$paths_module_template,
			$realpathHtml,
			$realpathResourceDir,
			$realpathDataDir,
			$options;

	/** FileSystem Utility */
	private $fs;

	/** LangBank object */
	private $lb;

	/** Resource Manager */
	private $resourceMgr;

	/** BaseClass of Fields */
	private $fieldBase;

	/** Field Definitions */
	private $fieldDefinitions;

	/** cache */
	private $_moduleCollection;

	/**
	 * Constructor
	 */
	public function __construct(){
		$this->fs = new \tomk79\filesystem();
	}

	/**
	 * $fs
	 * @return object FileSystem Utility Object.
	 */
	public function fs(){
		return $this->fs;
	}

	/**
	 * $lb
	 * @return object LangBank Object.
	 */
	public function lb(){
		return $this->lb;
	}

	/**
	 * $fieldBase
	 * @return object fieldBase Object.
	 */
	public function fieldBase(){
		return $this->fieldBase;
	}

	/**
	 * $resourceMgr
	 * @return object Resource Manager Object.
	 */
	public function resourceMgr(){
		return $this->resourceMgr;
	}

	/**
	 * Initialize
	 * @param array $options オプション
	 */
	public function init( $options = array() ){
		$options = (is_array($options) ? $options : array());
		$options['appMode'] = ($options['appMode'] ? $options['appMode'] : 'web'); // web | desktop
		$options['paths_module_template'] = ($options['paths_module_template'] ? $options['paths_module_template'] : array());
		$options['documentRoot'] = ($options['documentRoot'] ? $options['documentRoot'] : '.'); // current directory.
		$options['pathHtml'] = ($options['pathHtml'] ? $options['pathHtml'] : null);
		$options['pathResourceDir'] = ($options['pathResourceDir'] ? $options['pathResourceDir'] : null);
		$options['realpathDataDir'] = ($options['realpathDataDir'] ? $options['realpathDataDir'] : null);
		$options['bindTemplate'] = ($options['bindTemplate'] ? $options['bindTemplate'] : function($htmls){
			$fin = '';
			foreach($htmls as $i=>$row){
				$fin .= $htmls[$i];
			}
			return $fin;
		});
		$options['log'] = ($options['log'] ? $options['log'] : function($msg){
			var_dump($msg);
		});
		if( !$options['pathHtml'] || !$options['pathResourceDir'] || !$options['realpathDataDir'] ){
			// 必須項目
			// var_dump($options);
			var_dump('[ERROR] $options[\'pathHtml\'], $options[\'pathResourceDir\'], and $options[\'realpathDataDir\'] are required.');
			return;
		}

		foreach( $options['paths_module_template'] as $i=>$row ){
			$options['paths_module_template'][$i] = $this->fs->get_realpath( $options['documentRoot'].'/'.$this->fs->normalize_path( $options['paths_module_template'][$i] ).'/' );
		}

		$options['pathHtml'] = $this->fs->normalize_path( $this->fs->get_realpath($options['pathHtml']) );
		$options['pathResourceDir'] = $this->fs->normalize_path( $this->fs->get_realpath($options['pathResourceDir']) );

		$this->paths_module_template = $options['paths_module_template'];
		$this->realpathHtml = $this->fs->normalize_path($this->fs->get_realpath( $options['documentRoot'].'/'.$options['pathHtml'] ));
		$this->realpathResourceDir = $this->fs->normalize_path($this->fs->get_realpath( $options['documentRoot'].'/'.$options['pathResourceDir'].'/' ));
		$this->realpathDataDir = $this->fs->normalize_path($this->fs->get_realpath( $options['realpathDataDir'].'/' ));
		$this->options = $options;

		$this->resourceMgr = new resourceMgr($this);
		$this->fieldBase = new fieldBase($this);
		$this->fieldDefinitions = array();

		$this->lb = new \tomk79\LangBank(__DIR__.'/../data/language.csv');

		$this->resourceMgr->init();

		$loadFieldDefinition = function($fieldId, $mod = null){
			if(is_null($mod) || !class_exists($mod)){
				$mod = 'broccoliHtmlEditor\\fields\\'.$fieldId;
			}
			if(!class_exists($mod)){
				return null;
			}
			$rtn = new $mod( $this );
			$rtn->__fieldId__ = $fieldId;
			return $rtn;
		};
		$this->fieldDefinitions['href'] = $loadFieldDefinition('href');
		$this->fieldDefinitions['html'] = $loadFieldDefinition('html');
		$this->fieldDefinitions['html_attr_text'] = $loadFieldDefinition('html_attr_text');
		$this->fieldDefinitions['image'] = $loadFieldDefinition('image');
		$this->fieldDefinitions['markdown'] = $loadFieldDefinition('markdown');
		$this->fieldDefinitions['multitext'] = $loadFieldDefinition('multitext');
		$this->fieldDefinitions['select'] = $loadFieldDefinition('select');
		$this->fieldDefinitions['text'] = $loadFieldDefinition('text');

		if( $this->options['customFields'] ){
			foreach( $this->options['customFields'] as $idx=>$className ){
				$this->fieldDefinitions[$idx] = $loadFieldDefinition( $idx, $this->options['customFields'][$idx] );
			}
		}
	}

	// /**
	//  * 汎用API
	//  * @param  {[type]}   api      [description]
	//  * @param  {[type]}   options  [description]
	//  * @param  {Function} callback [description]
	//  * @return {[type]}            [description]
	//  */
	// this.gpi = function(api, options, callback){
	// 	var gpi = require( __dirname+'/gpi.js' );
	// 	gpi(
	// 		this,
	// 		api,
	// 		options,
	// 		function(rtn){
	// 			callback(rtn);
	// 		}
	// 	);
	// 	return this;
	// }

	// /**
	//  * アプリケーションの実行モード設定を取得する (同期)
	//  * @return string 'web'|'desktop'
	//  */
	// this.getAppMode = function(){
	// 	var rtn = this.options.appMode;
	// 	switch(rtn){
	// 		case 'web':
	// 		case 'desktop':
	// 			break;
	// 		default:
	// 			rtn = 'web';
	// 			break;
	// 	}
	// 	return rtn;
	// }

	/**
	 * field定義を取得する
	 * @param  {String} fieldType フィールドの種類(text, html, markdown, multitext, etc...)
	 * @return {Object}           inputフィールドの定義オブジェクト
	 */
	public function getFieldDefinition($fieldType){
		$fieldDefinition = $this->fieldDefinitions[$fieldType];
		if( $this->fieldDefinitions[$fieldType] ){
			// 定義済みのフィールドを返す
			$fieldDefinition = $this->fieldDefinitions[$fieldType];
		}else{
			// 定義がない場合は、デフォルトのfield定義を返す
			$fieldDefinition = $this->fieldBase;
		}
		return $fieldDefinition;
	}

	/**
	 * モジュールIDを分解する
	 */
	public function parseModuleId( $moduleId ){
		$rtn = array(
			'package' => false,
			'category' => false,
			'module' => false,
		);
		if( !is_string($moduleId) ){
			return false;
		}
		if( !preg_match('/^(?:([0-9a-zA-Z\\_\\-\\.]*?)\\:)?([^\\/\\:\\s]+)\\/([^\\/\\:\\s]+)$/', $moduleId, $matched) ){
			return false;
		}
		$rtn['package'] = $matched[1];
		$rtn['category'] = $matched[2];
		$rtn['module'] = $matched[3];

		if( !strlen($rtn['package']) ){
			$rtn['package'] = null;
		}
		return $rtn;
	}

	// /**
	//  * インスタンスパスの末尾の連番を1つ進める
	//  */
	// this.incrementInstancePath = require('./fncs/incrementInstancePath.js');

	/**
	 * モジュールの絶対パスを取得する
	 */
	public function getModuleRealpath( $moduleId ){
		$parsedModuleId = $this->parseModuleId($moduleId);
		if($parsedModuleId === false){
			return false;
		}
		if(!@$this->paths_module_template[$parsedModuleId['package']]){
			return false;
		}
		$realpath = $this->fs->get_realpath($this->paths_module_template[$parsedModuleId['package']]);
		if( !file_exists($realpath) || !is_dir($realpath) ){
			return false;
		}
		$realpath = $this->fs->get_realpath( $realpath.'/'.$parsedModuleId['category'].'/'.$parsedModuleId['module'].'/' );
		if( !file_exists($realpath) || !is_dir($realpath) ){
			return false;
		}

		return $this->fs->normalize_path($realpath);
	}

	/**
	 * システムテンプレートかどうか判断する
	 * @param  {String}  moduleId モジュールID
	 * @return {Boolean}          システムテンプレートであれば true, 違えば false
	 */
	public function isSystemMod( $moduleId ){
		if(!is_string($moduleId)){
			return false;
		}
		if( !preg_match('/^_sys\\//s', $moduleId) ){
			return false;
		}
		return true;
	}

	/**
	 * パッケージ一覧の取得
	 */
	public function getPackageList(){

		$modules = $this->paths_module_template;
		$rtn = array();

		foreach( $modules as $idx=>$row ){
			$realpath = $row;
			$infoJson = json_decode(file_get_contents( $realpath.'/info.json' ));

			$rtn[$idx] = array(
				'packageId' => $idx,
				'packageName' => ($infoJson->name ? $infoJson->name : $idx),
				'realpath' => $realpath,
				'infoJson' => $infoJson,
				'deprecated' => (@$infoJson->deprecated ? true : false),
			);
			$modList = $this->getModuleListByPackageId($idx);
			$rtn[$idx]['categories'] = $modList['categories'];
		}
		return $rtn;
	}

	/**
	 * モジュール一覧を取得する
	 * @param  string $packageId package ID
	 * @return array モジュール一覧
	 */
	public function getModuleListByPackageId($packageId){

		$rtn = array();

		$sortModuleDirectoryNames = function($dirNames, $sortBy){
			if( !is_array($sortBy) ){ return $dirNames; }
			sort($dirNames);
			$deleteArrayElm = function($ary, $val){
				foreach( $ary as $i=>$row ){
					if( $ary[$i] === $val ){
						array_splice($ary, $i , 1);
						return true;
					}
				}
				return false;
			};
			$arrayFind = function($ary, $val){
				foreach( $ary as $i=>$row ){
					if( $ary[$i] === $val ){return true;}
				}
				return false;
			};

			$rtn = array();
			foreach( $sortBy as $i=>$row ){
				if( !$arrayFind($dirNames, $row) ){continue;}
				array_push($rtn, $row);
				$deleteArrayElm($dirNames, $row);
			}
			foreach( $dirNames as $i=>$row ){
				array_push($rtn, $row);
			}
			return $rtn;
		};

		// パッケージ情報を取得
		$rtn['packageId'] = $packageId;
		$rtn['realpath'] = $this->paths_module_template[$packageId];
		if(is_null($rtn['realpath'])){
			$rtn['packageId'] = false;
			$rtn['realpath'] = false;
			return $rtn;
		}
		$rtn['packageInfo'] = json_decode(file_get_contents( $rtn['realpath'].'/info.json' ));
		if(is_null($rtn['packageInfo'])){
			$rtn['packageInfo'] = array();
		}


		// モジュールカテゴリをリスト化
		$fileList = $this->fs->ls($rtn['realpath']);
		// var_dump($fileList);
		// var_dump($rtn['packageInfo']->sort);
		$rtn['categories'] = array();
		$fileList = $sortModuleDirectoryNames($fileList, @$rtn['packageInfo']->sort);
		foreach($fileList as $idx=>$row){
			$realpath = $this->fs->get_realpath($rtn['realpath'].'/'.$row);
			if( is_dir($realpath) ){
				$realpath .= '/';
				$rtn['categories'][$row] = array();
				$rtn['categories'][$row]['categoryId'] = $row;
				$rtn['categories'][$row]['categoryInfo'] = @json_decode(file_get_contents( $realpath.'/info.json' ));
				if( is_null($rtn['categories'][$row]['categoryInfo']) ){
					$rtn['categories'][$row]['categoryInfo'] = array();
				}
				$rtn['categories'][$row]['categoryName'] = (@$rtn['categories'][$row]['categoryInfo']->name ? $rtn['categories'][$row]['categoryInfo']->name : $row);
				$rtn['categories'][$row]['realpath'] = $realpath;
				$rtn['categories'][$row]['deprecated'] = (@$rtn['categories'][$row]['categoryInfo']->deprecated ? true : false);
				$rtn['categories'][$row]['modules'] = array();
			}
		}


		foreach($rtn['categories'] as $idx=>$row){
			$fileList = $this->fs->ls( $rtn['categories'][$idx]['realpath'] );
			// var_dump($fileList);
			// var_dump($row['categoryInfo']->sort);

			$fileList = $sortModuleDirectoryNames($fileList, @$row['categoryInfo']->sort);

			foreach($fileList as $idx2=>$row2){
				$realpath = $this->fs->get_realpath($rtn['categories'][$idx]['realpath'].'/'.$row2.'/');
				if( !is_dir($realpath) ){
					continue;
				}

				$rtn['categories'][$idx]['modules'][$row2] = array();

				// moduleId
				$moduleId = $rtn['packageId'].':'.$rtn['categories'][$idx]['categoryId'].'/'.$row2;
				$rtn['categories'][$idx]['modules'][$row2]['moduleId'] = $moduleId;

				// info.json
				$rtn['categories'][$idx]['modules'][$row2]['moduleInfo'] = json_decode('{}');
				if( is_file( $realpath.'/info.json' ) ){
					$rtn['categories'][$idx]['modules'][$row2]['moduleInfo'] = json_decode(file_get_contents( $realpath.'/info.json' ));
				}
				$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->enabledParents = $this->normalizeEnabledParentsOrChildren(@$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->enabledParents, $moduleId);
				if( is_string(@$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->enabledBowls)  ){
					$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->enabledBowls = array($rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->enabledBowls);
				}
				$rtn['categories'][$idx]['modules'][$row2]['deprecated'] = (@$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->deprecated ? $rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->deprecated : false);

				// clip.json
				$rtn['categories'][$idx]['modules'][$row2]['clip'] = false;
				if( is_file( $realpath.'/clip.json' ) ){
					$rtn['categories'][$idx]['modules'][$row2]['clip'] = json_decode(file_get_contents( $realpath.'/clip.json' ));
				}

				// moduleName
				$rtn['categories'][$idx]['modules'][$row2]['moduleName'] = (@$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->name ? $rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->name : $moduleId);

				// realpath
				$rtn['categories'][$idx]['modules'][$row2]['realpath'] = $realpath;

				// thumb.png
				$realpathThumb = $this->fs->get_realpath( $realpath.'/thumb.png' );
				$rtn['categories'][$idx]['modules'][$row2]['thumb'] = null;
				if( is_file($realpathThumb) ){
					$rtn['categories'][$idx]['modules'][$row2]['thumb'] = 'data:image/png;base64,'+base64_encode( file_get_contents( $realpathThumb ) );
				}

				// README.md (html)
				$realpathReadme = $this->fs->get_realpath( $realpath.'/README' );
				$readme = '';
				if( is_file($realpathReadme.'.html') ){
					$readme = file_get_contents( $realpathReadme.'.html' );
				}elseif( is_file($realpathReadme.'.md') ){
					$readme = file_get_contents( $realpathReadme.'.md' );
					$readme = \Michelf\MarkdownExtra::defaultTransform($readme);
				}

				$rtn['categories'][$idx]['modules'][$row2]['readme'] = $readme;

				// pics/
				$realpathPics = $this->fs->get_realpath( $realpath.'/pics/' );
				$rtn['categories'][$idx]['modules'][$row2]['pics'] = array();
				if( is_dir($realpathPics) ){
					$piclist = $this->fs->ls($realpathPics);
					uasort($piclist, function($a,$b){
						if( $a < $b ) return -1;
						if( $a > $b ) return 1;
						return 0;
					});
					foreach( $piclist as $picIdx=>$row ){
						$imgPath = '';
						if( is_file($realpathPics.'/'.$piclist[$picIdx]) ){
							$imgPath = base64_encode(file_get_contents( $realpathPics.'/'.$piclist[$picIdx] ));
						}
						// var_dump( $imgPath );
						array_push($rtn['categories'][$idx]['modules'][$row2]['pics'], 'data:image/png;base64,'.$imgPath);
					}
				}

				$modInstance = $this->getModule($moduleId, null);
				$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->interface = (@$rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->interface ? $rtn['categories'][$idx]['modules'][$row2]['moduleInfo']->interface : $modInstance->fields());

			}

		}

		return $rtn;
	}

	/**
	 * enabledParents または enabledChildren を正規化する
	 * @param {*} enabledParentsOrChildren
	 * @param {*} currentModuleId
	 */
	public function normalizeEnabledParentsOrChildren($enabledParentsOrChildren, $currentModuleId){
		$enabledParentsOrChildren = ($enabledParentsOrChildren ? $enabledParentsOrChildren : array());
		if(is_string($enabledParentsOrChildren)){
			$enabledParentsOrChildren = array($enabledParentsOrChildren);
		}
		foreach( $enabledParentsOrChildren as $idx=>$row ){
			$enabledParentsOrChildren[$idx] = $this->completeModuleId( $enabledParentsOrChildren[$idx], $currentModuleId );
		}
		return $enabledParentsOrChildren;
	}

	/**
	 * モジュールIDを補完して完成させる
	 * @param {*} targetModuleId
	 * @param {*} currentModuleId
	 */
	private function completeModuleId($targetModuleId, $currentModuleId){
		$currentModuleId = ($currentModuleId ? $currentModuleId : '');
		preg_match('/^([\s\S]+)\:([\s\S]+)\/([\s\S]+?)$/', $currentModuleId, $matched);
		$pkgName = $matched[1];
		$catName = $matched[2];
		$mogName = $matched[3];
		if(preg_match('/^_sys\//', $targetModuleId)){
			// システムフィールドはそのまま
			return $targetModuleId;
		}
		if(!preg_match('/^[\S]+\:/', $targetModuleId)){
			$targetModuleId = $pkgName.':'.$targetModuleId;
			return $targetModuleId;
		}
		return $targetModuleId;
	}

	/**
	 * 全モジュールの一覧を取得する
	 * @param  {Function} callback  callback function.
	 * @return {Object}             this
	 */
	public function getAllModuleList(){
		static $_allModuleList = null;
		if( $_allModuleList ){
			return $_allModuleList;
		}

		$modules = $this->paths_module_template;
		$data = array('tmp'=>array(), 'rtn'=>array());

		$list = $this->getPackageList();
		$data['tmp']['_sys/root'] = $this->createModuleInstance('_sys/root');
		$data['tmp']['_sys/unknown'] = $this->createModuleInstance('_sys/unknown');
		$data['tmp']['_sys/html'] = $this->createModuleInstance('_sys/html');

		foreach( $list as $pkgId=>$pkg ){
			foreach( $list[$pkgId]['categories'] as $catId=>$cat ){
				foreach( $list[$pkgId]['categories'][$catId]['modules'] as $modId=>$mod ){
					$data['tmp'][$mod['moduleId']] = $this->createModuleInstance($mod['moduleId']);
				}
			}
		}

		foreach( $data['tmp'] as $modId=>$obj ){
			$obj->init();
			$data['rtn'][$modId] = json_decode('{}');
			$data['rtn'][$modId]->id = $obj->id;
			$data['rtn'][$modId]->fields = $obj->fields;
			$data['rtn'][$modId]->isSystemModule = $obj->isSystemModule;
			$data['rtn'][$modId]->isSingleRootElement = $obj->isSingleRootElement;
			$data['rtn'][$modId]->templateType = $obj->templateType;
			$data['rtn'][$modId]->template = $obj->template;
			$data['rtn'][$modId]->info = $obj->info;
			if($obj->subModule){
				$data['rtn'][$modId]->subModule = array();
				foreach( $obj->subModule as $idx=>$row ){
					$data['rtn'][$modId]->subModule[$idx] = json_decode('{}');
					// var_dump($data['rtn'][$modId]->subModule[$idx]);
					// var_dump($obj->subModule[$idx]);
					$data['rtn'][$modId]->subModule[$idx]->id = $obj->subModule[$idx]->id;
					$data['rtn'][$modId]->subModule[$idx]->subModName = $obj->subModule[$idx]->subModName;
					$data['rtn'][$modId]->subModule[$idx]->fields = $obj->subModule[$idx]->fields;
					$data['rtn'][$modId]->subModule[$idx]->isSystemModule = $obj->subModule[$idx]->isSystemModule;
					$data['rtn'][$modId]->subModule[$idx]->isSingleRootElement = $obj->subModule[$idx]->isSingleRootElement;
					$data['rtn'][$modId]->subModule[$idx]->templateType = $obj->subModule[$idx]->templateType;
					$data['rtn'][$modId]->subModule[$idx]->template = $obj->subModule[$idx]->template;
					$data['rtn'][$modId]->subModule[$idx]->info = $obj->subModule[$idx]->info;
				}
			}
		}
	
		return $data['rtn'];
	}

	/**
	 * class: モジュール
	 * @param  {String}   moduleId モジュールID
	 * @param  {Object}   options  Options
	 * @return {Object}            this
	 */
	public function createModuleInstance($moduleId, $options = array()){
		// var_dump($moduleId);
		// var_dump($options);
		$rtn = new classModule($this, $moduleId, $options);
		return $rtn;
	}

	/**
	 * モジュールオブジェクトを取得する
	 * @param  {String}   moduleId モジュールID
	 * @param  {String}   subModName サブモジュール名
	 * @param  {Function} callback  callback function.
	 * @return {Object}            this
	 */
	public function getModule($moduleId, $subModName){
		$rtn = @$this->_moduleCollection[$moduleId];
		if( $rtn === false ){
			// 過去に生成を試みて、falseになっていた場合
			return false;
		}
		if( is_null($rtn) ){
			$mod = $this->createModuleInstance($moduleId);
			$this->_moduleCollection[$moduleId] = $mod;
			if( $this->_moduleCollection[$moduleId] === false ){
				// falseの場合、該当するモジュールが定義されていない。
				// 結果を記憶して、falseを返す。
				return false;
			}
			$this->_moduleCollection[$moduleId]->init();
			$rtn = $this->_moduleCollection[$moduleId];
			if( is_string($subModName) ){
				return $rtn->subModule[$subModName];
			}
			return $rtn;
		}
		if( is_string($subModName) ){
			if( !$rtn->subModule || !$rtn->subModule[$subModName] ){
				// var_dump('Undefined subModule "'.$subModName.'" was called.');
				return false;
			}

			return $rtn->subModule[$subModName];
		}

		return $rtn;
	}

	// /**
	//  * マークダウン処理
	//  */
	// this.markdown = function(md, options, callback){
	// 	callback = callback||function(){};
	// 	var marked = require('marked');
	// 	marked.setOptions({
	// 		renderer: new marked.Renderer(),
	// 		gfm: true,
	// 		tables: true,
	// 		breaks: false,
	// 		pedantic: false,
	// 		sanitize: false,
	// 		smartLists: true,
	// 		smartypants: false
	// 	});

	// 	if(typeof(md)===typeof('')){
	// 		md = marked(md);
	// 	}
	// 	new Promise(function(rlv){rlv();})
	// 		.then(function(){ return new Promise(function(rlv, rjt){
	// 			callback(md);
	// 		}); })
	// 	;
	// 	return this;
	// }

	/**
	 * HTMLをビルドする
	 * ビルドしたHTMLは、callback() に文字列として渡されます。
	 * realpathに指定したファイルは自動的に上書きされません。
	 *
	 * @param  {Object}   data     コンテンツデータ
	 * @param  {Object}   options  オプション
	 *                             - options.mode = ビルドモード(finalize=製品版ビルド, canvas=編集画面用ビルド)
	 *                             - options.instancePath = インスタンスパス
	 * @param  {Function} callback callback function.
	 * @return {Object}            this
	 */
	public function buildBowl( $data, $options ){
		$buildBowl = new buildBowl($this, $data, $options);
		return $buildBowl->build();
	}

	// /**
	//  * HTMLをすべてビルドする
	//  * ビルドしたHTMLは、callback() に文字列として渡されます。
	//  * realpathに指定したファイルは自動的に上書きされません。
	//  *
	//  * @param  {Object}   options  オプション
	//  *                             - options.mode = ビルドモード(finalize=製品版ビルド, canvas=編集画面用ビルド)
	//  *                             - options.bowlList = ボウル名の一覧。data.jsonに含まれていないbowlがある場合、空白の領域としてあわせてビルドされる。
	//  * @param  {Function} callback callback function.
	//  * @return {Object}            this
	//  */
	// this.buildHtml = function( options, callback ){
	// 	var dataJson = fs.readFileSync(this.realpathDataDir+'/data.json');
	// 	try {
	// 		dataJson = JSON.parse( dataJson );
	// 	} catch (e) {
	// 		console.error('ERROR: Failed to parse data.json.', this.realpathDataDir+'/data.json');
	// 		this.log('ERROR: Failed to parse data.json. '+this.realpathDataDir+'/data.json');
	// 		dataJson = {};
	// 	}
	// 	dataJson.bowl = dataJson.bowl||{};
	// 	options.bowlList = options.bowlList||[];
	// 	if( options.bowlList.length ){
	// 		for( var idx in options.bowlList ){
	// 			dataJson.bowl[options.bowlList[idx]] = dataJson.bowl[options.bowlList[idx]]||{
	// 				"modId": "_sys/root",
	// 				"fields": {
	// 					"main": []
	// 				}
	// 			};
	// 		}
	// 	}

	// 	var htmls = {};
	// 	it79.ary(
	// 		dataJson.bowl,
	// 		function(it1, row, idx){
	// 			options.instancePath = '/bowl.'+idx;
	// 			_this.buildBowl(row, options, function(html){
	// 				htmls[idx] = html;
	// 				it1.next();
	// 			});
	// 		},
	// 		function(){
	// 			callback(htmls);
	// 		}
	// 	);
	// 	return this;
	// }

	// /**
	//  * コンテンツをビルドし、更新する
	//  *
	//  * ビルドしたHTMLは、`pathHtml` のファイルに上書き保存されます。
	//  * リソースも合わせて処理されます。
	//  *
	//  * @param  {Function} callback callback function.
	//  * @return {Object}            this
	//  */
	// this.updateContents = function( callback ){
	// 	callback = callback || function(){};
	// 	var broccoli = this;
	// 	broccoli.resourceMgr.getResourceDb(
	// 		function(resourceDb){
	// 			broccoli.resourceMgr.save(
	// 				resourceDb ,
	// 				function(result){
	// 					broccoli.buildHtml(
	// 						{
	// 							'mode': 'finalize'
	// 						},
	// 						function(htmls){
	// 							broccoli.options.bindTemplate(htmls, function(fin){
	// 								fs.writeFile(
	// 									broccoli.realpathHtml ,
	// 									fin ,
	// 									function(){
	// 										callback(true);
	// 									}
	// 								);
	// 							});
	// 						}
	// 					);
	// 				}
	// 			);
	// 		}
	// 	);
	// 	return this;
	// }

	/**
	 * モジュールのCSSをビルドする
	 */
	public function buildModuleCss(){
		$builder = new buildModuleResources( $this );
		return $builder->buildCss();
	}

	/**
	 * モジュールのJavaScriptをビルドする
	 */
	public function buildModuleJs(){
		$builder = new buildModuleResources( $this );
		return $builder->buildJs();
	}

	/**
	 * ログファイルにメッセージを出力する
	 */
	public function log($msg){
		$this->options['log']($msg);
		return;
	}
}
