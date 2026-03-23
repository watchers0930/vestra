var GOOGLE_ADWORDS_TRACE = function(){
	var use_npay_count = false;
	var payment_trace_id = '';
	var Completepayment = function(trace_id, total_price, currency, order_no){
		gtag('event', 'conversion', {
			'send_to': trace_id,
			'value': total_price,
			'currency': currency,
			'transaction_id': order_no
		});
	};
	var EtcTrace = function(trace_id){ // 결제 완료 외 액션은 형식이 같고 전환 ID 만 다름
		gtag('event', 'conversion', {
			'send_to' : trace_id
		});
	};

	var setUseNpayCount = function(flag,trace_id){
		use_npay_count = (flag === true);
		if(trace_id != '') payment_trace_id = trace_id;
	};

	var addNpayOrder = function(order_data){
		if(!use_npay_count) return false;
		if(typeof order_data == 'undefined') return false;
		if(typeof order_data['list'] == 'undefined') return false;
		if(payment_trace_id == '') return false;

		var np_ga_data = {'order_no' : '', 'total_price' : 0};
		for(var i = 0; i < order_data['list'].length; i++){
			if(np_ga_data['order_no'] == ''){
				np_ga_data['order_no'] = order_data['list'][i]['order_no'];
			}
		}
		np_ga_data['total_price'] = order_data['total_price'];
		Completepayment(payment_trace_id,String(np_ga_data['total_price']),'KRW',np_ga_data['order_no']);
	};

	return {
		"Completepayment" : function(trace_id, total_price, currency, order_no){
			Completepayment(trace_id, total_price, currency, order_no);
		},
		"EtcTrace" : function(trace_id){
			EtcTrace(trace_id);
		},
		"setUseNpayCount" : function(flag,trace_id){
			setUseNpayCount(flag,trace_id);
		},
		"addNpayOrder" : function(order_data){
			addNpayOrder(order_data);
		}
	}
}();





