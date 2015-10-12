/**
 * broccoli.js
 */
module.exports = function(options){
	delete(require.cache[require('path').resolve(__filename)]);

	var _this = this;
	var path = require('path');
	var it79 = require('iterate79');
	var fs = require('fs');
	var _ = require('underscore');
	options = options || {};
	options.paths_module_template = options.paths_module_template || {};
	options.documentRoot = options.documentRoot || '.'; // current directory.
	options.pathHtml = options.pathHtml || null;
	options.pathResourceDir = options.pathResourceDir || null;
	options.realpathDataDir = options.realpathDataDir || null;
	options.bindTemplate = options.bindTemplate || function(htmls, callback){
		var fin = ''; for(var i in htmls){ fin += htmls[i]; } callback(fin);
	};
	if( !options.pathHtml || !options.pathResourceDir || !options.realpathDataDir ){
		// 必須項目
		// console.log(options);
		console.error('[ERROR] options.pathHtml, options.pathResourceDir, and options.realpathDataDir are required.');
		return;
	}

	for( var i in options.paths_module_template ){
		options.paths_module_template[i] = path.resolve( options.documentRoot, options.paths_module_template[i] )+'/';
	}

	this.paths_module_template = options.paths_module_template;
	this.realpathHtml = path.resolve( options.documentRoot, './'+options.pathHtml );
	this.realpathResourceDir = path.resolve( options.documentRoot, './'+options.pathResourceDir );
	this.realpathDataDir = path.resolve( options.realpathDataDir );
	this.options = options;

	this.resourceMgr = new (require('./resourceMgr.js'))(this);
	this.fieldBase = new (require('./fieldBase.js'))(this);
	this.fieldDefinitions = {};
	function loadFieldDefinition(){
		function loadFieldDefinition(mod){
			return _.defaults( new (mod)(_this), _this.fieldBase );
		}
		_this.fieldDefinitions.href = loadFieldDefinition(require(__dirname+'/fields/app.fields.href.js'));
		_this.fieldDefinitions.html = loadFieldDefinition(require(__dirname+'/fields/app.fields.html.js'));
		_this.fieldDefinitions.html_attr_text = loadFieldDefinition(require(__dirname+'/fields/app.fields.html_attr_text.js'));
		_this.fieldDefinitions.image = loadFieldDefinition(require(__dirname+'/fields/app.fields.image.js'));
		_this.fieldDefinitions.markdown = loadFieldDefinition(require(__dirname+'/fields/app.fields.markdown.js'));
		_this.fieldDefinitions.multitext = loadFieldDefinition(require(__dirname+'/fields/app.fields.multitext.js'));
		_this.fieldDefinitions.select = loadFieldDefinition(require(__dirname+'/fields/app.fields.select.js'));
		_this.fieldDefinitions.table = loadFieldDefinition(require(__dirname+'/fields/app.fields.table.js'));
		_this.fieldDefinitions.text = loadFieldDefinition(require(__dirname+'/fields/app.fields.text.js'));
		_this.fieldDefinitions.wysiwyg_rte = loadFieldDefinition(require(__dirname+'/fields/app.fields.wysiwyg_rte.js'));
		_this.fieldDefinitions.wysiwyg_tinymce = loadFieldDefinition(require(__dirname+'/fields/app.fields.wysiwyg_tinymce.js'));

		return true;
	}

	/**
	 * 初期化
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	this.init = function(callback){
		it79.fnc({},
			[
				function(it1, data){
					_this.resourceMgr.init( function(){
						it1.next(data);
					} );
				} ,
				function(it1, data){
					loadFieldDefinition();
					it1.next(data);
				} ,
				function(it1, data){
					callback();
					it1.next(data);
				}
			]
		);
		return this;
	}

	/**
	 * 汎用API
	 * @param  {[type]}   api      [description]
	 * @param  {[type]}   options  [description]
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	this.gpi = function(api, options, callback){
		var gpi = require( __dirname+'/gpi.js' );
		gpi(
			this,
			api,
			options,
			function(rtn){
				callback(rtn);
			}
		);
		return this;
	}

	/**
	 * モジュールIDを分解する。
	 * @param  {String} moduleId モジュールID
	 * @return {Object}          分解された情報を格納するオブジェクト、分解に失敗した場合はfalseを返します。
	 */
	this.parseModuleId = function(moduleId){
		var rtn = {
			'package': false,
			'category': false,
			'module': false
		};
		if( !moduleId.match( new RegExp('^([0-9a-zA-Z\\_\\-]+?)\\:([^\\/\\:\\s]*)\\/([^\\/\\:\\s]*)$') ) ){
			return false;
		}
		rtn.package = RegExp.$1;
		rtn.category = RegExp.$2;
		rtn.module = RegExp.$3;
		return rtn;
	}

	/**
	 * モジュールの絶対パスを取得する。
	 * @param  {String} moduleId モジュールID
	 * @return {String}          モジュールの絶対パス
	 */
	this.getModuleRealpath = function(moduleId){
		var parsedModuleId = this.parseModuleId(moduleId);
		if(parsedModuleId === false){
			return false;
		}
		if(!this.paths_module_template[parsedModuleId.package]){
			return false;
		}
		var realpath = path.resolve(this.paths_module_template[parsedModuleId.package]);
		if( !fs.existsSync(realpath) || !fs.statSync(realpath).isDirectory() ){
			return false;
		}
		var realpath = path.resolve(
			realpath,
			parsedModuleId.category,
			parsedModuleId.module
		);
		if( !fs.existsSync(realpath) || !fs.statSync(realpath).isDirectory() ){
			return false;
		}

		return realpath+'/';
	}

	/**
	 * システムテンプレートかどうか判断する
	 * @param  {String}  moduleId モジュールID
	 * @return {Boolean}          システムテンプレートであれば true, 違えば false
	 */
	this.isSystemMod = function( moduleId ){
		if( !moduleId.match(new RegExp('^_sys\\/')) ){
			return false;
		}
		return true;
	}

	/**
	 * パッケージの一覧を取得する
	 * @param  {Function} callback callback function.
	 * @return {Object}            this
	 */
	this.getPackageList = function(callback){
		require( './getPackageList.js' )(this, callback);
		return this;
	}

	/**
	 * モジュール一覧を取得する
	 * @param  {String}   packageId package ID
	 * @param  {Function} callback  callback function.
	 * @return {Object}             this
	 */
	this.getModuleListByPackageId = function(packageId, callback){
		require( './getModuleListByPackageId.js' )(this, packageId, callback);
		return this;
	}

	/**
	 * 全モジュールの一覧を取得する
	 * @param  {Function} callback  callback function.
	 * @return {Object}             this
	 */
	this.getAllModuleList = function(callback){
		require( './getAllModuleList.js' )(this, callback);
		return this;
	}

	/**
	 * class: モジュール
	 * @param  {String}   moduleId モジュールID
	 * @param  {Object}   options  Options
	 * @param  {Function} callback callback function.
	 * @return {Object}            this
	 */
	this.createModuleInstance = function(moduleId, options, callback){
		var classModule = require( './classModule.js' );
		var rtn = new classModule(this, moduleId, options, callback);
		return rtn;
	}

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
	this.buildBowl = function( data, options, callback ){
		var buildBowl = require( __dirname+'/buildBowl.js' );
		buildBowl(_this, data, options, callback);
		return this;
	}

	/**
	 * HTMLをすべてビルドする
	 * ビルドしたHTMLは、callback() に文字列として渡されます。
	 * realpathに指定したファイルは自動的に上書きされません。
	 *
	 * @param  {Object}   options  オプション
	 *                             - options.mode = ビルドモード(finalize=製品版ビルド, canvas=編集画面用ビルド)
	 * @param  {Function} callback callback function.
	 * @return {Object}            this
	 */
	this.buildHtml = function( options, callback ){
		var dataJson = fs.readFileSync(this.realpathDataDir+'/data.json');
		dataJson = JSON.parse( dataJson );
		dataJson.bowl = dataJson.bowl||{};

		var htmls = {};
		it79.ary(
			dataJson.bowl,
			function(it1, row, idx){
				options.instancePath = '/bowl.'+idx;
				_this.buildBowl(row, options, function(html){
					htmls[idx] = html;
					it1.next();
				});
			},
			function(){
				callback(htmls);
			}
		);
		return this;
	}

}
