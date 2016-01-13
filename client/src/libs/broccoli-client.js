/**
 * broccoli-client.js
 */
(function(module){
	var __dirname = (function() {
		if (document.currentScript) {
			return document.currentScript.src;
		} else {
			var scripts = document.getElementsByTagName('script'),
			script = scripts[scripts.length-1];
			if (script.src) {
				return script.src;
			}
		}
	})().replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');

	module.exports = function(){
		// if(!window){delete(require.cache[require('path').resolve(__filename)]);}
		// console.log(__dirname);

		var _this = this;
		var it79 = require('iterate79');
		var _ = require('underscore');
		var $ = require('jquery');
		var selectedInstance = null;
		var $canvas;
		var redrawTimer;
		this.__dirname = __dirname;

		/**
		 * broccoli-client を初期化する
		 * @param  {Object}   options  options.
		 * @param  {Function} callback callback function.
		 * @return {Object}            this.
		 */
		this.init = function(options, callback){
			options = options || {};
			options.elmCanvas = options.elmCanvas || document.createElement('div');
			options.elmPanels = document.createElement('div');
			options.elmInstancePathView = options.elmInstancePathView || document.createElement('div');
			options.elmInstanceTreeView = options.elmInstanceTreeView || document.createElement('div');
			options.elmModulePalette = options.elmModulePalette || document.createElement('div');
			options.contents_area_selector = options.contents_area_selector || '.contents';
			options.contents_bowl_name_by = options.contents_bowl_name_by || 'id';
			options.gpiBridge = options.gpiBridge || function(){};
			this.options = options;

			$canvas = $(options.elmCanvas);
			$canvas
				.addClass('broccoli')
				.addClass('broccoli--canvas')
				.append( $('<iframe>')
				)
				.append( $('<div class="broccoli--panels">')
				)
				// .append( $('<div class="broccoli--instance-path-view">')
				// )
			;
			$canvas.find('iframe')
				.bind('load', function(){
					console.log('broccoli: preview loaded');
					onPreviewLoad( callback );
				})
			;
			// this.options.elmIframeWindow = $canvas.find('iframe').get(0).contentWindow;
			this.options.elmPanels = $canvas.find('.broccoli--panels').get(0);
			// this.options.elmInstancePathView = $canvas.find('.broccoli--instance-path-view').get(0);

			this.clipboard = new (require('./clipboard.js'))(this);
			this.postMessenger = new (require('./postMessenger.js'))(this, $canvas.find('iframe').get(0));
			this.resourceMgr = new (require('./resourceMgr.js'))(this);
			this.panels = new (require( './panels.js' ))(this);
			this.instancePathView = new (require( './instancePathView.js' ))(this);
			this.instanceTreeView = new (require( './instanceTreeView.js' ))(this);
			this.editWindow = new (require( './editWindow.js' ))(this);
			this.fieldBase = new (require('./../../../libs/fieldBase.js'))(this);
			this.fieldDefinitions = {};
			function loadFieldDefinition(){
				function loadFieldDefinition(fieldId, mod){
					var rtn = _.defaults( new (mod)(_this), _this.fieldBase );
					rtn.__fieldId__ = fieldId;
					return rtn;
				}
				_this.fieldDefinitions.href = loadFieldDefinition('href', require('./../../../libs/fields/app.fields.href.js'));
				_this.fieldDefinitions.html = loadFieldDefinition('html', require('./../../../libs/fields/app.fields.html.js'));
				_this.fieldDefinitions.html_attr_text = loadFieldDefinition('html_attr_text', require('./../../../libs/fields/app.fields.html_attr_text.js'));
				_this.fieldDefinitions.image = loadFieldDefinition('image', require('./../../../libs/fields/app.fields.image.js'));
				_this.fieldDefinitions.markdown = loadFieldDefinition('markdown', require('./../../../libs/fields/app.fields.markdown.js'));
				_this.fieldDefinitions.multitext = loadFieldDefinition('multitext', require('./../../../libs/fields/app.fields.multitext.js'));
				_this.fieldDefinitions.select = loadFieldDefinition('select', require('./../../../libs/fields/app.fields.select.js'));
				_this.fieldDefinitions.text = loadFieldDefinition('text', require('./../../../libs/fields/app.fields.text.js'));

				if( _this.options.customFields ){
					for( var idx in _this.options.customFields ){
						_this.fieldDefinitions[idx] = loadFieldDefinition( idx, _this.options.customFields[idx] );
					}
				}

				return true;
			}
			loadFieldDefinition();

			it79.fnc(
				{},
				[
					function(it1, data){
						_this.contentsSourceData = new (require('./contentsSourceData.js'))(_this).init(
							function(){
								it1.next(data);
							}
						);
					} ,
					function(it1, data){
						_this.resourceMgr.init(function(){
							it1.next(data);
						});
					} ,
					function(it1, data){
						_this.drawModulePalette(function(){
							console.log('broccoli: module palette standby.');
							it1.next(data);
						});
					} ,
					function(it1, data){
						_this.instanceTreeView.init(_this.options.elmInstanceTreeView, function(){
							console.log('broccoli: instanceTreeView standby.');
							it1.next(data);
						});
					} ,
					function(it1, data){
						_this.instancePathView.init(_this.options.elmInstancePathView, function(){
							console.log('broccoli: instancePathView standby.');
							it1.next(data);
						});
					} ,
					function( it1, data ){
						// 編集画面描画ロード
						$canvas.find('iframe')
							.attr({
								'src': $canvas.attr('data-broccoli-preview')
							})
						;
						it1.next(data);

					} ,
					function(it1, data){
						console.log('broccoli: init done.');
						// callback(); // <- onPreviewLoad() がコールするので、ここでは呼ばない。
						it1.next();
					}
				]
			);
			return this;
		}

		/**
		 * プレビューがロードされたら実行
		 * @return {[type]} [description]
		 */
		function onPreviewLoad( callback ){
			callback = callback || function(){};
			if(_this.postMessenger===undefined){return;}// broccoli.init() の実行前

			it79.fnc(
				{},
				[
					function( it1, data ){
						// postMessageの送受信を行う準備
						_this.postMessenger.init(function(){
							it1.next(data);
						});
					} ,
					function( it1, data ){
						// 編集画面描画
						_this.redraw(function(){
							it1.next(data);
						});
					} ,
					function(it1, data){
						callback();
						it1.next();
					}
				]
			);
			return this;
		}

		/**
		 * 画面を再描画
		 * @return {[type]} [description]
		 */
		this.redraw = function(callback){
			callback = callback || function(){};

			it79.fnc(
				{},
				[
					function( it1, data ){
						// タイマー処理
						// ウィンドウサイズの変更などの際に、無駄な再描画連打を減らすため
						clearTimeout( redrawTimer );
						redrawTimer = setTimeout(function(){
							it1.next(data);
						}, 100);
					} ,
					function( it1, data ){
						// 編集パネルを一旦消去
						_this.panels.clearPanels(function(){
							it1.next(data);
						});
					} ,
					function( it1, data ){
						// 編集画面描画
						_this.postMessenger.send(
							'getBowlList',
							{
								'contents_area_selector': _this.options.contents_area_selector ,
								'contents_bowl_name_by': _this.options.contents_bowl_name_by
							},
							function(bowlList){
								// console.log(bowlList);
								for( var idx in bowlList ){
									_this.contentsSourceData.initBowlData(bowlList[idx]);
								}
								_this.gpi(
									'buildHtml',
									{'bowlList': bowlList},
									function(htmls){
										// console.log(htmls);
										_this.postMessenger.send(
											'updateHtml',
											{
												'contents_area_selector': _this.options.contents_area_selector ,
												'contents_bowl_name_by': _this.options.contents_bowl_name_by ,
												'htmls': htmls
											},
											function(){
												console.log('broccoli: HTML standby.');
												it1.next(data);
											}
										);
									}
								);
							}
						);
					} ,
					function( it1, data ){
						// ちょっと間を置く
						setTimeout(function(){
							it1.next(data);
						},100);
					} ,
					function( it1, data ){
						// iframeのサイズ合わせ
						_this.postMessenger.send(
							'getHtmlContentHeight',
							{},
							function(height){
								// console.log(height);
								$canvas.find('iframe').height( height + 16 );
								it1.next(data);
							}
						);
					} ,
					function( it1, data ){
						// ちょっと間を置く
						setTimeout(function(){
							it1.next(data);
						},100);
					} ,
					function( it1, data ){
						// パネル描画
						_this.drawPanels( function(){
							console.log('broccoli: draggable panels standby.');
							it1.next(data);
						} );
					} ,
					function( it1, data ){
						// インスタンスツリービュー描画
						_this.instanceTreeView.update( function(){
							it1.next(data);
						} );
					} ,
					function( it1, data ){
						// インスタンスパスビューを更新
						_this.instancePathView.update( function(){
							it1.next(data);
						} );
					} ,
					function(it1, data){
						callback();
						it1.next();
					}
				]
			);
			return this;
		}

		/**
		 * field定義を取得する
		 * @param  {[type]} fieldType [description]
		 * @return {[type]}           [description]
		 */
		this.getFieldDefinition = function(fieldType){
			var fieldDefinition = this.fieldDefinitions[fieldType];
			if( this.fieldDefinitions[fieldType] ){
				// 定義済みのフィールドを返す
				fieldDefinition = this.fieldDefinitions[fieldType];
			}else{
				// 定義がない場合は、デフォルトのfield定義を返す
				fieldDefinition = this.fieldBase;
			}
			return fieldDefinition;
		}

		/**
		 * GPIから値を得る
		 */
		this.gpi = function(api, options, callback){
			this.options.gpiBridge(api, options, callback);
			return this;
		}

		/**
		 * インスタンスを編集する
		 * @param  {[type]} instancePath [description]
		 * @return {[type]}              [description]
		 */
		this.editInstance = function( instancePath ){
			this.selectInstance(instancePath);
			console.log("Edit: "+instancePath);
			$canvas.find('.broccoli--lightbox').remove();
			$canvas
				.append( $('<div class="broccoli--lightbox">')
					.append( $('<div class="broccoli--lightbox-inner">')
					)
				)
			;
			this.drawEditWindow( instancePath, $canvas.find('.broccoli--lightbox-inner').get(0), function(){
				$canvas.find('.broccoli--lightbox').fadeOut('fast',function(){$(this).remove();});
				it79.fnc({},[
					function(it1, data){
						// 編集パネルを一旦消去
						_this.panels.clearPanels(function(){
							it1.next(data);
						});
					} ,
					function(it1, data){
						// コンテンツデータを保存
						_this.saveContents(function(){
							it1.next(data);
						});
					} ,
					function(it1, data){
						// 画面を再描画
						_this.redraw(function(){
							it1.next(data);
						});
					} ,
					function(it1, data){
						console.log('editInstance done.');
						it1.next(data);
					}
				]);
			} );
			return this;
		}

		/**
		 * インスタンスを選択する
		 */
		this.selectInstance = function( instancePath, callback ){
			console.log("Select: "+instancePath);
			callback = callback || function(){};
			var broccoli = this;
			broccoli.unselectInstance();//一旦選択解除
			broccoli.unfocusInstance();//フォーカスも解除
			selectedInstance = instancePath;
			broccoli.panels.selectInstance(instancePath, function(){
				broccoli.instanceTreeView.selectInstance(instancePath, function(){
					broccoli.instancePathView.update(function(){
						callback();
					});
				});
			});
			return this;
		}

		/**
		 * モジュールインスタンスの選択状態を解除する
		 */
		this.unselectInstance = function(callback){
			callback = callback || function(){};
			selectedInstance = null;
			var broccoli = this;
			broccoli.panels.unselectInstance(function(){
				broccoli.instanceTreeView.unselectInstance(function(){
					broccoli.instancePathView.update(function(){
						callback();
					});
				});
			});
			return this;
		}

		/**
		 * モジュールインスタンスにフォーカスする
		 * フォーカス状態の囲みで表現され、画面に収まるようにスクロールする
		 */
		this.focusInstance = function( instancePath, callback ){
			callback = callback || function(){};
			var _this = this;
			this.unfocusInstance();//一旦選択解除
			this.panels.focusInstance(instancePath, function(){

				var $targetElm = $(_this.panels.getPanelElement(instancePath));
				if($targetElm.size()){
					var top = $canvas.scrollTop() + $targetElm.offset().top - 30;
					$canvas.stop().animate({"scrollTop":top} , 'fast' );
				}

				callback();
			});
			return this;

		}

		/**
		 * モジュールインスタンスのフォーカス状態を解除する
		 */
		this.unfocusInstance = function(callback){
			callback = callback || function(){};
			selectedInstance = null;
			this.panels.unfocusInstance(function(){
				callback();
			});
			return this;
		}

		/**
		 * 選択されたインスタンスのパスを取得する
		 */
		this.getSelectedInstance = function(){
			return selectedInstance;
		}

		/**
		 * 選択したインスタンスをクリップボードへコピーする
		 */
		this.copy = function(callback){
			callback = callback||function(){};

			var data = _this.contentsSourceData.get( _this.getSelectedInstance() );
			data = JSON.stringify( data, null, 1 );
			_this.clipboard.set( data );
			_this.message('インスタンスをコピーしました。');

			callback(true);
			return;
		}

		/**
		 * クリップボードの内容を選択したインスタンスの位置に挿入する
		 */
		this.paste = function(callback){
			callback = callback||function(){};
			var selectedInstance = _this.getSelectedInstance();
			if( typeof(selectedInstance) !== typeof('') ){
				_this.message('インスタンスを選択した状態でペーストしてください。');
				callback(false);
				return;
			}
			// console.log(selectedInstance);

			var data = _this.clipboard.get();
			try {
				data = JSON.parse( data );
			} catch (e) {
				_this.message('クリップボードのデータをデコードできませんでした。');
				callback(false);
				return;
			}
			// console.log(data);
			_this.contentsSourceData.duplicateInstance(data, function(data){
				// console.log(data);

				_this.contentsSourceData.addInstance( data, selectedInstance, function(){
					_this.message('インスタンスをペーストしました。');
					_this.saveContents(function(result){
						// 画面を再描画
						_this.redraw(function(){
							_this.selectInstance(selectedInstance, function(){
								callback(true);
							});
						});
					});
				} );

			});
			return;
		}

		/**
		 * 選択したインスタンスを削除する
		 */
		this.remove = function(callback){
			callback = callback||function(){};

			var selectedInstance = _this.getSelectedInstance();
			if( typeof(selectedInstance) !== typeof('') ){
				_this.message('インスタンスを選択した状態で削除してください。');
				callback(false);
				return;
			}
			// console.log(selectedInstance);

			_this.contentsSourceData.removeInstance(selectedInstance, function(){
				_this.message('インスタンスを削除しました。');
				_this.saveContents(function(result){
					// 画面を再描画
					_this.redraw(function(){
						_this.unselectInstance(function(){
							callback(true);
						});
					});
				});
			});
			return;
		}

		/**
		 * history: 取り消し (非同期)
		 */
		this.historyBack = function( cb ){
			cb = cb||function(){};
			this.contentsSourceData.historyBack(function(result){
				if(result === false){cb();return;}
				_this.saveContents(function(){
					// 画面を再描画
					_this.redraw(cb);
				});
			});
			return this;
		}

		/**
		 * history: やりなおし (非同期)
		 */
		this.historyGo = function( cb ){
			cb = cb||function(){};
			this.contentsSourceData.historyGo(function(result){
				if(result === false){cb();return;}
				_this.saveContents(function(){
					// 画面を再描画
					_this.redraw(cb);
				});
			});
			return this;
		}

		/**
		 * モジュールパレットを描画する
		 * @param  {Object}   moduleList モジュール一覧。
		 * @param  {Function} callback   callback function.
		 * @return {Object}              this.
		 */
		this.drawModulePalette = function(callback){
			require( './drawModulePalette.js' )(_this, callback);
			return this;
		}

		/**
		 * 編集用UI(Panels)を描画する
		 * @param  {Function} callback    callback function.
		 * @return {Object}               this.
		 */
		this.drawPanels = function(callback){
			this.panels.init(this.options.elmPanels, callback);
			return this;
		}

		/**
		 * 編集ウィンドウを描画する
		 * @param  {Function} callback    callback function.
		 * @return {Object}               this.
		 */
		this.drawEditWindow = function(instancePath, elmEditWindow, callback){
			this.editWindow.init(instancePath, elmEditWindow, callback);
			return this;
		}

		/**
		 * [function description]
		 * @param  {String}   message  メッセージ
		 * @param  {Function} callback コールバック関数
		 * @return {Object}            this.
		 */
		this.message = function(message, callback){
			console.info(message);
			return this;
		}

		/**
		 * コンテンツデータを保存する
		 */
		this.saveContents = function(callback){
			callback = callback || function(){};
			it79.fnc({},[
				function(it1, data){
					// コンテンツを保存
					_this.contentsSourceData.save(function(){
						it1.next(data);
					});
				} ,
				function(it1, data){
					// リソースを保存
					_this.resourceMgr.save(function(){
						it1.next(data);
					});
				} ,
				function(it1, data){
					// console.log('editInstance done.');
					callback(true);
					it1.next(data);
				}
			]);
			return this;
		}

	}

})(module);
