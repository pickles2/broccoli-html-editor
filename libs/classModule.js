/**
 * classModule.js
 * モジュールを解析・構造化するオブジェクトクラスです。
 * 1つのモジュールを単位として表現します。
 * コンテンツデータは含みません。よって、bind() のような機能は持ちません。
 */
module.exports = function(broccoli, moduleId, options){
	delete(require.cache[require('path').resolve(__filename)]);

	var _this = this;
	options = options || {};

	var Promise = require('es6-promise').Promise;
	var utils79 = require('utils79');
	var it79 = require('iterate79');
	var path = require('path');
	var php = require('phpjs');
	var fs = require('fs');

	var rtn = {};

	var realpath = broccoli.getModuleRealpath(moduleId);
	this.isSystemModule = broccoli.isSystemMod(moduleId);

	function isFile(path){
		if( !fs.existsSync(path) || !fs.statSync(path).isFile() ){
			return false;
		}
		return true;
	}
	function isDirectory(path){
		if( !fs.existsSync(path) || !fs.statSync(path).isDirectory() ){
			return false;
		}
		return true;
	}
	function base64_encode( bin ){
		var base64 = bin.toString('base64');
		return base64;
	}
	function markdownSync(str){
		if( typeof(str) !== typeof('') ){return str;}
		var marked = require('marked');
		marked.setOptions({
			renderer: new marked.Renderer(),
			gfm: true,
			tables: true,
			breaks: false,
			pedantic: false,
			sanitize: false,
			smartLists: true,
			smartypants: false
		});
		str = marked(str);
		return str;
	}

	// console.log('classModTpl -> '+moduleId);

	this.isSingleRootElement = false;
	this.path = null;
	if( !this.isSystemModule && typeof(options.src) !== typeof('') ){
		try {
			this.path = fs.realpathSync( broccoli.getModuleRealpath(moduleId) )+'/';
		} catch (e) {
			moduleId = '_sys/unknown';
			this.isSystemModule = true;
		}
	}
	this.id = moduleId;
	this.fields = {};
	this.templateType = 'broccoli';
	this.finalize = function(html, callback){callback(html);return;}

	this.info = {
		name: null,
		areaSizeDetection: 'shallow',
		enabledParents: [],
		enabledBowls: [],
		interface: {},
		deprecated: false
	};

	if( options.topThis ){
		this.topThis = options.topThis;
		this.templateType = this.topThis.templateType;
		this.info.name = '- ' + this.topThis.info.name;
		if( options.modName ){
			this.info.name = '- ' + options.modName;
		}
		// this.nameSpace = options.topThis.nameSpace;
		if( options.subModName ){
			this.subModName = options.subModName;
			if( this.topThis.subModule[this.subModName] ){
				// console.log(this.topThis.subModule[this.subModName]);
				this.fields = this.topThis.subModule[this.subModName].fields;
			}
		}
	}else{
		this.topThis = this;
		// this.nameSpace = {"vars": {}};
	}

	/**
	 * description を正規化する
	 * @param {*} description 
	 */
	function normalizeDescription(description){
		description = description || '';
		description = markdownSync( description );
		return description;
	}

	/* 閉じタグを探す */
	this.searchEndTag = function( src, fieldType ){
		var rtn = {
			content: '',
			nextSrc: src
		};
		var depth = 0;
		while( 1 ){
			if( !rtn.nextSrc.match(new RegExp('^((?:.|\r|\n)*?)\\{\\&((?:.|\r|\n)*?)\\&\\}((?:.|\r|\n)*)$') ) ){
				break;
			}
			rtn.content += RegExp.$1;
			var fieldSrc = RegExp.$2;
			var field = {};
			try {
				field = JSON.parse( fieldSrc );
			} catch (e) {
				console.error('ERROR: Failed to parse field.', fieldSrc);
				broccoli.log('ERROR: Failed to parse field. '+fieldSrc);
			}
			rtn.nextSrc = RegExp.$3;

			if( field == 'end'+fieldType ){
				if( depth ){
					depth --;
					rtn.content += '{&'+fieldSrc+'&}';
					continue;
				}
				return rtn;
			}else if( field[fieldType] ){
				depth ++;
				rtn.content += '{&'+fieldSrc+'&}';
				continue;
			}else{
				rtn.content += '{&'+fieldSrc+'&}';
				continue;
			}
		}
		return rtn;
	}

	/**
	 * テンプレートを解析する
	 */
	function parseTpl(src, _this, _topThis, callback){
		new Promise(function(rlv){rlv();}).then(function(){ return new Promise(function(rlv, rjt){

			callback = callback||function(){};
			if(src !== null){
				src = JSON.parse( JSON.stringify( src ) );
			}
			_this.template = src;

			if( _this.path && isDirectory( _this.path ) ){
				if( isFile( _this.path+'/info.json' ) ){
					var tmpJson = {};
					try{
						tmpJson = JSON.parse( fs.readFileSync( _this.path+'/info.json' ) );
					}catch(e){
						var tmp_targetfile = utils79.basename(utils79.dirname(utils79.dirname(utils79.dirname(_this.path+'/info.json'))))+'/'+utils79.basename(utils79.dirname(utils79.dirname(_this.path+'/info.json')))+'/'+utils79.basename(utils79.dirname(_this.path+'info.json'))+'/info.json';
						broccoli.error( 'module info.json parse error: ' + tmp_targetfile );
					}
					if( typeof(tmpJson) != typeof({}) || tmpJson === null ){
						var tmp_targetfile = utils79.basename(utils79.dirname(utils79.dirname(utils79.dirname(_this.path+'/info.json'))))+'/'+utils79.basename(utils79.dirname(utils79.dirname(_this.path+'/info.json')))+'/'+utils79.basename(utils79.dirname(_this.path+'info.json'))+'/info.json';
						broccoli.error( 'module info.json contains a non object or null: ' + tmp_targetfile );
						tmpJson = {};
					}
					if( tmpJson.name ){
						_this.info.name = tmpJson.name;
					}
					if( tmpJson.areaSizeDetection ){
						_this.info.areaSizeDetection = tmpJson.areaSizeDetection;
					}
					_this.info.enabledParents = broccoli.normalizeEnabledParentsOrChildren(tmpJson.enabledParents, moduleId);
					if( typeof(tmpJson.enabledBowls) == typeof('') ){
						_this.info.enabledBowls = [tmpJson.enabledBowls];
					}else if( typeof(tmpJson.enabledBowls) == typeof([]) ){
						_this.info.enabledBowls = tmpJson.enabledBowls;
					}


					if( tmpJson.interface ){
						if( tmpJson.interface.fields ){
							_this.fields = tmpJson.interface.fields;
							for( var tmpIdx in _this.fields ){
								// name属性を自動補完
								_this.fields[tmpIdx].name = tmpIdx;
							}
						}
						if( tmpJson.interface.subModule ){
							_this.subModule = tmpJson.interface.subModule;
							for( var tmpIdx in _this.subModule ){
								for( var tmpIdx2 in _this.subModule[tmpIdx].fields ){
									// name属性を自動補完
									_this.subModule[tmpIdx].fields[tmpIdx2].name = tmpIdx2;
								}
							}
						}
					}
					if( tmpJson.deprecated ){
						_this.info.deprecated = tmpJson.deprecated;
					}
				}
				_this.deprecated = (_this.info.deprecated||false);
				_this.thumb = null;
				if( isFile( _this.path+'/thumb.png' ) ){
					_this.thumb = (function(){
						var tmpBin = fs.readFileSync( _this.path+'/thumb.png' ).toString();
						var tmpBase64;
						try {
							tmpBase64 = base64_encode( tmpBin );
						} catch (e) {
							console.log('ERROR: base64_encode() FAILED; -> '+_this.path+'/thumb.png');
							return null;
						}
						return 'data:image/png;base64,'+tmpBase64;
					})();
				}
			}

			if( src ){
				_this.isSingleRootElement = (function(tplSrc){
					// 単一のルート要素を持っているかどうか判定。
					tplSrc = JSON.parse( JSON.stringify(tplSrc) );
					tplSrc = tplSrc.replace( new RegExp('\\<\\!\\-\\-[\\s\\S]*?\\-\\-\\>','g'), '' );
					tplSrc = tplSrc.replace( new RegExp('\\{\\&[\\s\\S]*?\\&\\}','g'), '' );
					tplSrc = tplSrc.replace( new RegExp('\\r\\n|\\r|\\n','g'), '' );
					tplSrc = tplSrc.replace( new RegExp('\\t','g'), '' );
					tplSrc = tplSrc.replace( new RegExp('^[\\s\\r\\n]*'), '' );
					tplSrc = tplSrc.replace( new RegExp('[\\s\\r\\n]*$'), '' );
					if( tplSrc.length && tplSrc.indexOf('<') === 0 && tplSrc.match(new RegExp('\\>$')) ){
						var htmlparser = require('htmlparser');
						var handler = new htmlparser.DefaultHandler(function (error, dom) {
							// console.log('htmlparser callback');
							if (error){
								// console.log(error);
							}
						});
						// console.log('htmlparser after');
						var parser = new htmlparser.Parser(handler);
						parser.parseComplete(tplSrc);
						// console.log(handler.dom);

						if( handler.dom.length == 1 ){
							return true;
						}
					}
					return false;
				})(src);
			}

			var field = null;

			if( _topThis.templateType != 'broccoli' ){
				// テンプレートエンジン(Twigなど)利用の場合の処理
				if( _this.subModName ){
					_this.fields = _topThis.subModule[_this.subModName].fields;
				}

				it79.ary(
					_this.fields ,
					function( it2, row, tmpFieldName ){
						row.description = normalizeDescription(row.description);
						if( _this.fields[tmpFieldName].fieldType == 'module' ){
							_this.fields[tmpFieldName].enabledChildren = broccoli.normalizeEnabledParentsOrChildren(_this.fields[tmpFieldName].enabledChildren, moduleId);
						}

						if( _this.fields[tmpFieldName].fieldType == 'loop' ){
							_this.subModule = _this.subModule || {};

							_topThis.subModule[tmpFieldName] = broccoli.createModuleInstance( _this.id, {
								"src": '',
								"subModName": tmpFieldName,
								"topThis":_topThis
							} );
							_topThis.subModule[tmpFieldName].init(function(){
								it2.next();
							});
							return;
						}
						it2.next();return;
					} ,
					function(){
						callback(true);
					}
				);
				return;

			}else{
				// Broccoliエンジン利用の処理
				function parseBroccoliTemplate(src, callback){
					if( !src.match(new RegExp('^((?:.|\r|\n)*?)\\{\\&((?:.|\r|\n)*?)\\&\\}((?:.|\r|\n)*)$') ) ){
						callback();
						return;
					}
					field = RegExp.$2;
					src = RegExp.$3;

					try{
						field = JSON.parse( field );
					}catch(e){
						var tmp_targetfile = utils79.basename(utils79.dirname(utils79.dirname(utils79.dirname(_this.templateFilename))))+'/'+utils79.basename(utils79.dirname(utils79.dirname(_this.templateFilename)))+'/'+utils79.basename(utils79.dirname(_this.templateFilename))+'/'+utils79.basename(_this.templateFilename);
						broccoli.error( 'module template parse error: ' + tmp_targetfile );
						field = {'input':{
							'type':'html',
							'name':'__error__'
						}};
					}
					try{
						_this.fields[field.input.name].description = normalizeDescription(_this.fields[field.input.name].description);
					}catch(e){
					}

					if( typeof(field) == typeof('') ){
						// end系：無視
						parseBroccoliTemplate( src, function(){
							callback();
						} );
						return;

					}else if( field.input ){
						_this.fields[field.input.name] = field.input;
						_this.fields[field.input.name].fieldType = 'input';

						parseBroccoliTemplate( src, function(){
							callback();
						} );
						return;
					}else if( field.module ){
						_this.fields[field.module.name] = field.module;
						_this.fields[field.module.name].fieldType = 'module';

						_this.fields[field.module.name].enabledChildren = broccoli.normalizeEnabledParentsOrChildren(_this.fields[field.module.name].enabledChildren, moduleId);
	
						parseBroccoliTemplate( src, function(){
							callback();
						} );
						return;
					}else if( field.loop ){
						_this.fields[field.loop.name] = field.loop;
						_this.fields[field.loop.name].fieldType = 'loop';

						var tmpSearchResult = _this.searchEndTag( src, 'loop' );
						src = tmpSearchResult.nextSrc;
						if( typeof(_this.subModule) !== typeof({}) ){
							_this.subModule = {};
						}
						// console.log(' <------- ');
						// console.log(field.loop.name);
						// console.log('on '+_topThis.moduleId);
						// console.log(tmpSearchResult.content);
						// console.log(' =======> ');
						_topThis.subModule[field.loop.name] = broccoli.createModuleInstance( _this.id, {
							"src": tmpSearchResult.content,
							"subModName": field.loop.name,
							"modName": (field.loop.label || field.loop.name),
							"topThis":_topThis
						});
						_topThis.subModule[field.loop.name].init(function(){
							parseBroccoliTemplate( src, function(){
								callback();
							} );
						});

						return;

					}else{
						parseBroccoliTemplate( src, function(){
							callback();
						} );
						return;
					}
				}//parseBroccoliTemplate()

				parseBroccoliTemplate( src, function(){
					callback(true);
				} );
				return;
			}
			// console.log(_this.fields);
			// callback(true);
		}); }); // Promise
		return;
	} // parseTpl()

	/**
	 * 初期化する
	 * @param  {Function} callback callback function.
	 * @return {Object}            this.
	 */
	this.init = function(callback){
		callback = callback || function(){};

		if( realpath === false && !_this.isSystemModule ){
			new Promise(function(rlv){rlv();}).then(function(){ return new Promise(function(rlv, rjt){
				callback(false);
			}); });
			return;
		}

		if( moduleId == '_sys/root' ){
			parseTpl( '{&{"module":{"name":"main"}}&}', _this, _this, callback );
		}else if( moduleId == '_sys/unknown' ){
			parseTpl( '<div style="background:#f00;padding:10px;color:#fff;text-align:center;border:1px solid #fdd;">[ERROR] 未知のモジュールテンプレートです。<!-- .error --></div>'+"\n", _this, _this, callback );
		}else if( moduleId == '_sys/html' ){
			parseTpl( '{&{"input":{"type":"html","name":"main"}}&}', _this, _this, callback );
		}else if( typeof(options.src) === typeof('') ){
			parseTpl( options.src, _this, options.topThis, callback );
		}else if( _this.topThis.templateType != 'broccoli' && typeof(_this.subModName) == typeof('') ){
			parseTpl( null, _this, options.topThis, callback );
		}else if( _this.path ){
			var tmpTplSrc = null;
			if( isFile( _this.path+'finalize.js' ) ){
				var tmpRealathFinalizeJs = require('path').resolve(_this.path+'finalize.js');
				delete(require.cache[tmpRealathFinalizeJs]);
				_this.finalize = require(tmpRealathFinalizeJs);
			}
			if( isFile( _this.path+'template.html' ) ){
				_this.templateFilename = _this.path+'template.html';
				_this.templateType = 'broccoli';
				tmpTplSrc = fs.readFileSync( _this.templateFilename );
			}else if( isFile( _this.path+'template.html.twig' ) ){
				_this.templateFilename = _this.path+'template.html.twig';
				_this.templateType = 'twig';
				tmpTplSrc = fs.readFileSync( _this.templateFilename );
			}
			if( !tmpTplSrc ){
				tmpTplSrc = '<div style="background:#f00;padding:10px;color:#fff;text-align:center;border:1px solid #fdd;">[ERROR] モジュールテンプレートの読み込みエラーです。<!-- .error --></div>'+"\n";
			}
			tmpTplSrc = JSON.parse( JSON.stringify( tmpTplSrc.toString() ) );
			parseTpl( tmpTplSrc, _this, _this, callback );
		}

		return this;
	}

	return;
}
