module.exports = function(broccoli){
	var utils79 = require('utils79');

	/**
	 * データをバインドする
	 */
	this.bind = function( fieldData, mode, mod, callback ){
		var rtn = '';
		if(typeof(fieldData)===typeof({}) && fieldData.src ){
			fieldData = utils79.toStr(fieldData.src);
		}else if( fieldData === undefined && mod.default ){
			// 値が undefined の場合は、defaultの値を参照する。
			// このケースは、既に使用されたモジュールに、
			// 後からselectフィールドを追加した場合などに発生する。
			fieldData = mod.default;
		}
		rtn = utils79.toStr(fieldData);

		if( !rtn.length && mod.options ){
			var isHit = false;
			for( var idx in mod.options ){
				if( rtn == mod.options[idx].value ){
					isHit = true;
					break;
				}
			}
			if( !isHit ){
				// 選択値が空白で、空白の選択肢がなければ、1件目のオプションを選ぶ。
				for( var idx in mod.options ){
					rtn = mod.options[idx].value;
					break;
				}
			}
		}
		if( mode == 'canvas' && !rtn.length ){
			// rtn = '(ダブルクリックして選択してください)';
				// ↑未選択時のダミー文はなしにした。
				// 　クラス名の modifier 部分の拡張などに使用する場合に、
				// 　クラス名とダミー文が合体して存在しないクラス名になってしまうので。
		}
		// setTimeout(function(){
			callback(rtn);
		// }, 0);
		return;
	}

}
