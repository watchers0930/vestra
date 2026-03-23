var ACE_COUNTER_PARTNER = function(){
	var type;

	var SetType = function(t){
		type = t;
	};

	var AddToCart = function(id, count, check_quantity){
		if(type == 'mweb'){
			if ( typeof AM_INOUT != 'undefined' ) {
				AM_INOUT(id,check_quantity);
			}
		}else{
			if ( typeof AW_F_D != 'undefined' ) {
				try{
					AW_F_D(id,'i',count);
				}catch(e){
				}
			}
		}
	};

	var  CompleteSearch = function(keyword){
		if(type == 'mweb'){
			var m_skey = keyword;
		}else{
			var _skey = keyword;
		}
	};


	return {
		"SetType" : function(t){
			SetType(t);
		},
		"AddToCart" : function(id, count, check_quantity){
			AddToCart(id, count, check_quantity);
		},
		"CompleteSearch" : function(keyword){
			CompleteSearch(keyword);
		}

	}
}();