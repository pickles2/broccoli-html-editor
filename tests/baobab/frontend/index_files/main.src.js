// console.log(broccoli);

/**
 * main.js
 */
window.main = new (function(){
	var _this = this;
	var it79 = require('iterate79');
	var socket = this.socket = window.baobabFw
		.createSocket(
			this,
			io,
			{
				'showSocketTest': function( data, callback, main, socket ){
					// console.log(data);
					// alert(data.message);
					// console.log(callback);
					callback(data);
					return;
				}
			}
		)
	;
	var broccoli = new Broccoli({
		'elmIframeWindow': $('iframe').get(0).contentWindow,
		'elmPanels': document.getElementById('panels'),
		'elmModulePalette': document.getElementById('palette'),
		'contents_area_selector': '[data-contents]',
		'contents_area_name_by': 'data-contents'
	});

	this.init = function(){
		// this.socketTest();
		it79.fnc(
			{},
			[
				function( it1, data ){
					// パッケージ・モジュール一覧を取得
					_this.socket.send(
						'broccoli',
						{
							'api': 'getPackageList'
						},
						function(packageList){
							// console.log(packageList);
							data.packageList = packageList;
							it1.next(data);
						}
					);
				} ,
				function( it1, data ){
					// モジュールパレットを初期化
					broccoli.drawModulePalette(data.packageList, function(){
						console.log('palette standby.');
						it1.next(data);
					});
				} ,
				function( it1, data ){
					// 編集画面描画
					_this.socket.send(
						'broccoli',
						{
							'api': 'buildHtmlAll'
						},
						function(htmls){
							// console.log(htmls);
							var $iframeWindow = $($('iframe').get(0).contentWindow.document);
							for(var i in htmls){
								$iframeWindow.find('[data-contents='+i+']').html(htmls[i]);
							}

							console.log('HTML standby.');
							it1.next(data);
						}
					);
				} ,
				function( it1, data ){
					// パネル描画
					broccoli.drawPanels(
						$('.contents', $('iframe').get(0).contentWindow.document).get(0),
						{
							'select': function(instancePath){
								console.log('select: '+instancePath);
							} ,
							'edit': function(instancePath){
								console.log('edit: '+instancePath);
							} ,
							'drop': function(instancePath, method){
								console.log(instancePath);
								console.log(method);
							} ,
							'remove': function(instancePath){
								console.log(instancePath);
							}
						},
						function(){
							it1.next(data);
						}
					);
				}
			]
		);
	}

	/**
	 * WebSocket疎通確認
	 */
	this.socketTest = function(){
		socket.send(
			'socketTest',
			{'message': 'socketTest from frontend.'} ,
			function(data){
				console.log(data);
				// alert('callback function is called!');
			}
		);
		return this;
	}

})();
