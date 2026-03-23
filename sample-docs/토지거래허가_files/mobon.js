var MOBON = function(){
	var enpVarInit = function(type){
		switch(type){
			case 'collect':
				ENP_VAR = { collect: {} };
				break;
			case 'conversion_npay':
			case 'conversion':
				ENP_VAR = { conversion: { product: [] } };
				break;
		}
	};
	var settingProdData = function(code, name, img, price, dc_price, category,is_sold){
		if(price == 0){
			price = dc_price;
			dc_price = 0;
		}
		ENP_VAR.collect.productCode = code;
		ENP_VAR.collect.productName = name;
		ENP_VAR.collect.price = price;
		ENP_VAR.collect.dcPrice = dc_price;
		ENP_VAR.collect.soldOut = is_sold;
		ENP_VAR.collect.imageUrl = img;
		ENP_VAR.collect.topCategory = category;
	};

	var settingOrderData = function(code,name,price,qty){
		var order_info = {
			productCode : code,
			productName : name,
			price : price,
			qty : qty
		};
		ENP_VAR.conversion.product.push(order_info);
	};

	var settingOrderNo = function(type,order_no,total_price,total_count){
		if(type == 'conversion'){
			ENP_VAR.conversion.ordCode = order_no;
			ENP_VAR.conversion.totalPrice = total_price;
			ENP_VAR.conversion.totalQty = total_count;
		}else{
			ENP_VAR.conversion.totalPrice = total_price;
			ENP_VAR.conversion.totalQty = total_count;
		}

	};

	return {
		"enpVarInit" : function(type){
			enpVarInit(type);
		},
		"settingProdData" : function(code, name, img, price, dc_price, category,is_sold){
			settingProdData(code, name, img, price, dc_price, category,is_sold);
		},
		"settingOrderData" : function(code,name,price,qty){
			settingOrderData(code,name,price,qty);
		},
		"settingOrderNo" : function(type,order_no,total_price,total_count){
			settingOrderNo(type,order_no,total_price,total_count);
		}
	}
}();