<?php
/**
 * broccoli-html-editor
 */
namespace broccoliHtmlEditor;

/**
 * classModule.php
 * モジュールを解析・構造化するオブジェクトクラスです。
 * 1つのモジュールを単位として表現します。
 * コンテンツデータは含みません。よって、bind() のような機能は持ちません。
 *
 * @author Tomoya Koyanagi <tomk79@gmail.com>
 */
class classModule{

	/** $broccoli */
	private $broccoli;

	/** $options */
	private $options;

	/** realpath module */
	private $realpath;

	/** values */
	private	$subModName,
			$isSingleRootElement,
			$isSystemModule,
			$templateFilename,
			$templateType,
			$path,
			$info,
			$id,
			$fields,
			$subModule,
			$topThis,
			$finalize;

	/**
	 * Constructor
	 */
	public function __construct($broccoli, $moduleId, $options = array()){
		$this->broccoli = $broccoli;
		$this->options = ($options ? $options : array());

		$this->realpath = $this->broccoli->getModuleRealpath($moduleId);
		$this->isSystemModule = $this->broccoli->isSystemMod($moduleId);

		// var_dump('classModTpl -> '.$moduleId);

		$this->isSingleRootElement = false;
		$this->path = null;
		if( !$this->isSystemModule && !is_string(@$options['src']) ){
			$tmpModuleRealpath = $this->broccoli->getModuleRealpath($moduleId);
			if(is_string($tmpModuleRealpath)){
				$this->path = $this->broccoli->fs()->get_realpath( $tmpModuleRealpath.'/' );
			}else{
				$moduleId = '_sys/unknown';
				$this->isSystemModule = true;
			}

		}
		$this->id = $moduleId;
		$this->fields = array();
		$this->subModule = array();
		$this->templateType = 'broccoli';
		$this->finalize = function($html){ return $html; };

		$this->info = array(
			'name' => null,
			'areaSizeDetection' => 'shallow',
			'enabledParents' => array(),
			'enabledBowls' => array(),
			'interface' => array(),
			'deprecated' => false
		);

		if( @$this->options['topThis'] ){
			$this->topThis = $this->options['topThis'];
			$this->templateType = $this->topThis->templateType;
			$this->info['name'] = '- ' . $this->topThis->info['name'] . ' -';
			// $this->nameSpace = $this->options['topThis']->nameSpace;
			if( $options['subModName'] ){
				$this->subModName = $options['subModName'];
				if( @$this->topThis->subModule[$this->subModName] ){
					// var_dump($this->topThis->subModule[$this->subModName]);
					$this->fields = $this->topThis->subModule[$this->subModName]->fields;
				}
			}
		}else{
			$this->topThis = $this;
			// $this->nameSpace = array("vars" => array());
		}
	}

	/**
	 * 初期化する
	 */
	public function init(){

		if( $this->realpath === false && !$this->isSystemModule ){
			return false;
		}

		if( $this->id == '_sys/root' ){
			return $this->parseTpl( '{&{"module":{"name":"main"}}&}', $this );
		}elseif( $this->id == '_sys/unknown' ){
			return $this->parseTpl( '<div style="background:#f00;padding:10px;color:#fff;text-align:center;border:1px solid #fdd;">[ERROR] 未知のモジュールテンプレートです。<!-- .error --></div>'+"\n", $this );
		}elseif( $this->id == '_sys/html' ){
			return $this->parseTpl( '{&{"input":{"type":"html","name":"main"}}&}', $this );
		}elseif( is_string(@$this->options['src']) ){
			return $this->parseTpl( $this->options['src'], $this->options['topThis'] );
		}elseif( $this->topThis->templateType != 'broccoli' && is_string($this->subModName) ){
			return $this->parseTpl( null, $this->options['topThis'] );
		}elseif( $this->path ){
			$tmpTplSrc = null;
			if( is_file( $this->path.'/finalize.php' ) ){
				$tmpRealathFinalizePhp = $this->broccoli->fs()->get_realpath($this->path.'/finalize.php');
				$this->finalize = include($tmpRealathFinalizePhp);
			}
			if( is_file( $this->path.'/template.html' ) ){
				$this->templateFilename = $this->path.'/template.html';
				$this->templateType = 'broccoli';
				$tmpTplSrc = file_get_contents( $this->templateFilename );
			}elseif( is_file( $this->path.'/template.html.twig' ) ){
				$this->templateFilename = $this->path.'/template.html.twig';
				$this->templateType = 'twig';
				$tmpTplSrc = file_get_contents( $this->templateFilename );
			}
			if( !is_string($tmpTplSrc) ){
				$tmpTplSrc = '<div style="background:#f00;padding:10px;color:#fff;text-align:center;border:1px solid #fdd;">[ERROR] モジュールテンプレートの読み込みエラーです。<!-- .error --></div>'+"\n";
			}
			$tmpTplSrc = json_decode( json_encode( $tmpTplSrc ) );
			return $this->parseTpl( $tmpTplSrc, $this );
		}

		return true;
	}


	/**
	 * $fields
	 */
	public function fields(){
		return $this->fields;
	}

	/**
	 * Markdown 文法を処理する
	 */
	private function markdownSync($str){
		if( !is_string($str) ){return $str;}
		$str = \Michelf\MarkdownExtra::defaultTransform($str);
		return $str;
	}

	/**
	 * description を正規化する
	 * @param {*} description 
	 */
	private function normalizeDescription($description){
		$description = ($description ? $description : '');
		$description = $this->markdownSync( $description );
		return $description;
	}

	/**
	 * broccoliテンプレートを解析する
	 */
	private function parseBroccoliTemplate( $src, $_topThis ){
		if( !preg_match( '/^((?:.|\r|\n)*?)\\{\\&((?:.|\r|\n)*?)\\&\\}((?:.|\r|\n)*)$/', $src, $matched ) ){
			return $src;
		}
		$field = $matched[2];
		$src = $matched[3];

		$field = json_decode( $field );
		if( is_null($field) ){
			$this->broccoli->log( 'module template parse error: ' . $this->templateFilename );
			$field = json_decode(json_encode(array(
				'input' => array(
					'type' => 'html',
					'name' => '__error__',
				)
			)));
		}

		if( is_string($field) ){
			// end系：無視
			return $this->parseBroccoliTemplate( $src, $_topThis );

		}elseif( @$field->input ){
			$this->fields[$field->input->name] = $field->input;
			$this->fields[$field->input->name]->fieldType = 'input';
			$this->fields[$field->input->name]->description = $this->normalizeDescription(@$this->fields[$field->input->name]->description);

			return $this->parseBroccoliTemplate( $src, $_topThis );
		}elseif( @$field->module ){
			$this->fields[$field->module->name] = $field->module;
			$this->fields[$field->module->name]->fieldType = 'module';
			$this->fields[$field->module->name]->description = $this->normalizeDescription(@$this->fields[$field->module->name]->description);

			$this->fields[$field->module->name]->enabledChildren = $this->broccoli->normalizeEnabledParentsOrChildren(@$this->fields[$field->module->name]->enabledChildren, $this->id);

			return $this->parseBroccoliTemplate( $src, $_topThis );
		}elseif( @$field->loop ){
			$this->fields[$field->loop->name] = $field->loop;
			$this->fields[$field->loop->name]->fieldType = 'loop';
			$this->fields[$field->loop->name]->description = $this->normalizeDescription(@$this->fields[$field->loop->name]->description);

			$tmpSearchResult = $this->searchEndTag( $src, 'loop' );
			$src = $tmpSearchResult['nextSrc'];
			if( !is_object($this->subModule) ){
				$this->subModule = array();
			}
			// var_dump(' <------- ');
			// var_dump($field->loop->name);
			// var_dump('on '.$_topThis->moduleId);
			// var_dump($tmpSearchResult['content']);
			// var_dump(' =======> ');
			$_topThis->subModule[$field->loop->name] = $this->broccoli->createModuleInstance( $this->id, array(
				"src" => $tmpSearchResult['content'],
				"subModName" => $field->loop->name,
				"topThis" => $_topThis
			));
			$_topThis->subModule[$field->loop->name]->init();

			return $this->parseBroccoliTemplate( $src, $_topThis );

		}else{
			return $this->parseBroccoliTemplate( $src, $_topThis );
		}
	} // parseBroccoliTemplate()

	/** 閉じタグを探す */
	private function searchEndTag($src, $fieldType){

		$rtn = array(
			'content' => '',
			'nextSrc' => $src
		);
		$depth = 0;
		while( 1 ){
			if( !preg_match('/^((?:.|\r|\n)*?)\\{\\&((?:.|\r|\n)*?)\\&\\}((?:.|\r|\n)*)$/', $rtn['nextSrc'], $matched) ){
				break;
			}
			$rtn['content'] .= $matched[1];
			$fieldSrc = $matched[2];
			$field = json_decode( $fieldSrc );
			if( is_null($field) ){
				$this->broccoli->log('ERROR: Failed to parse field. '.$fieldSrc);
			}
			$rtn['nextSrc'] = $matched[3];

			if( $field == 'end'.$fieldType ){
				if( $depth ){
					$depth --;
					$rtn['content'] .= '{&'.$fieldSrc.'&}';
					continue;
				}
				return $rtn;
			}elseif( @$field->{$fieldType} ){
				$depth ++;
				$rtn['content'] .= '{&'.$fieldSrc.'&}';
				continue;
			}else{
				$rtn['content'] .= '{&'.$fieldSrc.'&}';
				continue;
			}
		}
		return $rtn;

	}

	/**
	 * テンプレートを解析する
	 */
	private function parseTpl($src, $_topThis = null){
		if( is_null($_topThis) ){
			$_topThis = $this;
		}
		if( !is_null($src) ){
			$src = json_decode( json_encode( $src ) );
		}
		$this->template = $src;

		if( $this->path && is_dir( $this->path ) ){
			if( is_file( $this->path.'/info.json' ) ){
				$tmpJson = json_decode( file_get_contents( $this->path.'/info.json' ) );
				if(is_null($tmpJson)){
					$this->broccoli->log( 'module info.json parse error: '.$this->path.'/info.json' );
					$tmpJson = json_decode('{}');
				}

				if( @$tmpJson->name ){
					$this->info['name'] = $tmpJson->name;
				}
				if( @$tmpJson->areaSizeDetection ){
					$this->info['areaSizeDetection'] = $tmpJson->areaSizeDetection;
				}
				$this->info['enabledParents'] = $this->broccoli->normalizeEnabledParentsOrChildren(@$tmpJson->enabledParents, $this->id);
				if( is_string(@$tmpJson->enabledBowls) ){
					$this->info['enabledBowls'] = [$tmpJson->enabledBowls];
				}elseif( is_object(@$tmpJson->enabledBowls) || is_array(@$tmpJson->enabledBowls) ){
					$this->info['enabledBowls'] = $tmpJson->enabledBowls;
				}


				if( @$tmpJson->interface ){
					if( @$tmpJson->interface->fields ){
						foreach( $tmpJson->interface->fields as $tmpIdx=>$tmpRow  ){
							$this->fields[$tmpIdx] = $tmpRow;
							// name属性を自動補完
							$this->fields[$tmpIdx]->name = $tmpIdx;
						}
					}
					if( @$tmpJson->interface->subModule ){
						foreach( $tmpJson->interface->subModule as $tmpIdx=>$tmpRow  ){
							$this->subModule[$tmpIdx] = json_decode( json_encode( array(
								'fields'=>array()
							) ) );
							foreach( $tmpRow->fields as $tmpIdx2=>$tmpRow2 ){
								$this->subModule[$tmpIdx]->fields[$tmpIdx2] = json_decode('{}');
								// name属性を自動補完
								$this->subModule[$tmpIdx]->fields[$tmpIdx2]->name = $tmpIdx2;
							}
						}
					}
				}
				if( @$tmpJson->deprecated ){
					$this->info['deprecated'] = $tmpJson->deprecated;
				}
			}
			$this->deprecated = ($this->info['deprecated'] ? true : false);
			$this->thumb = null;
			if( is_file( $this->path.'/thumb.png' ) ){
				$tmpBin = file_get_contents( $this->path.'/thumb.png' );
				$tmpBase64 = base64_encode( $tmpBin );
				$this->thumb = 'data:image/png;base64,'.$tmpBase64;
			}
		}

		if( $src ){
			// 単一のルート要素を持っているかどうか判定。
			$this->isSingleRootElement = false;
			$tplSrc = $src;
			$tplSrc = json_decode( json_encode($tplSrc) );
			$tplSrc = preg_replace( '/\\<\\!\\-\\-[\\s\\S]*?\\-\\-\\>/s', $tplSrc, '' );
			$tplSrc = preg_replace( '/\\{\\&[\\s\\S]*?\\&\\}/s', $tplSrc, '' );
			$tplSrc = preg_replace( '/\\r\\n|\\r|\\n/s', $tplSrc, '' );
			$tplSrc = preg_replace( '/\\t/s', $tplSrc, '' );
			$tplSrc = preg_replace( '/^[\\s\\r\\n]*/', $tplSrc, '' );
			$tplSrc = preg_replace( '/[\\s\\r\\n]*$/', $tplSrc, '' );
			if( strlen($tplSrc) && strpos($tplSrc, '<') === 0 && preg_match('/\\>$/s', $tplSrc) ){
				// TODO: RootElementsの数を数える
				// var htmlparser = require('htmlparser');
				// var handler = new htmlparser.DefaultHandler(function (error, dom) {
				// 	// var_dump('htmlparser callback');
				// 	if (error){
				// 		// var_dump(error);
				// 	}
				// });
				// // var_dump('htmlparser after');
				// var parser = new htmlparser.Parser(handler);
				// parser.parseComplete(tplSrc);
				// // var_dump(handler.dom);

				// if( handler.dom.length == 1 ){
				// 	$this->isSingleRootElement = true;
				// }
			}
		}

		$field = null;

		if( $_topThis->templateType != 'broccoli' ){
			// テンプレートエンジン(Twigなど)利用の場合の処理
			if( $this->subModName ){
				$this->fields = $_topThis->subModule[$this->subModName]->fields;
			}

			foreach( $this->fields as $tmpFieldName=>$row ){
				$row->description = $this->normalizeDescription(@$row->description);
				if( @$this->fields[$tmpFieldName]->fieldType == 'module' ){
					$this->fields[$tmpFieldName]->enabledChildren = $this->broccoli->normalizeEnabledParentsOrChildren(@$this->fields[$tmpFieldName]->enabledChildren, $this->id);
				}

				if( @$this->fields[$tmpFieldName]->fieldType == 'loop' ){
					$this->subModule = ($this->subModule ? $this->subModule : array());

					$_topThis->subModule[$tmpFieldName] = $this->broccoli->createModuleInstance( $this->id, array(
						"src" => '',
						"subModName" => $tmpFieldName,
						"topThis" => $_topThis
					) );
					$_topThis->subModule[$tmpFieldName]->init();
				}
			}
			return true;

		}else{
			// Broccoliエンジン利用の処理
			$src = $this->parseBroccoliTemplate($src, $_topThis);
			return $src;
		}

	} // parseTpl()

}
