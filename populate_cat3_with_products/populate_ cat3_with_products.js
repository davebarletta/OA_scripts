function main() {
    var products = products_to_recreate();
    if(products !== null){	
    	create_cat3(products);
    }else{NSOA.meta.log('info', 'No new products to setup.');}
    
}

function products_to_recreate(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var nsprod = new NSOA.record.oaProduct();
    nsprod.netsuite_product_subtype__c = 'For Purchase';
    var notcreated = new NSOA.record.oaProduct();
    notcreated.picklistCostTypeCreated__c = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Product',
            fields: 'id, netsuite_product_id__c, name',
            method: 'equal to, not equal to',
            objects: [nsprod, notcreated],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            return null;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' records to process...');
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    name: o.name,
                    nsid: o.netsuite_product_id__c
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function create_cat3(array){
    var update_custom = [{name:"update_custom",value:"1"}];
	for(var i = 0; i<array.length; i++){
        var obj = new NSOA.record.oaCategory_3();
        obj.active = '1';
        obj.externalid = array[i].id;
        obj.name = array[i].name;
        obj.cat3NSProductId__c  = array[i].nsid;
        // Invoke the add call
		var addresults = NSOA.wsapi.add([obj]);
        var updobj = new NSOA.record.oaProduct();
        updobj.id = array[i].id;
        updobj.picklistCostTypeCreated__c = '1';
        // Invoke the modify call
		var updresults = NSOA.wsapi.modify(update_custom, [updobj]);
    }
}

function isEmpty(value) {
    if (value === null) {
        return true;
    } else if (value === undefined) {
        return true;
    } else if (value === '') {
        return true;
    } else if (value === ' ') {
        return true;
    } else if (value === 'null') {
        return true;
    } else {
        return false;
    }
}