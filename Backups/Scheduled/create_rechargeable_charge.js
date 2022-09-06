function main() {
    NSOA.meta.log('debug','Script Started...');
    var rechargeablepurchases = find_rechargeable_purchases();
    var chargeresults = upsert_charges(rechargeablepurchases);
    NSOA.meta.log('debug', 'Upsert: '+JSON.stringify(chargeresults));
}

function find_rechargeable_purchases(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 10;
    var minutespriorvalue = new Date(today.getTime() - (minutesprior * 60 * 1000));
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = minutespriorvalue.getDate();
    datenewer.month = (minutespriorvalue.getMonth()+1);
    datenewer.year = minutespriorvalue.getFullYear();
    datenewer.hour= minutespriorvalue.getHours();
    datenewer.second = minutespriorvalue.getSeconds();
    datenewer.minute = minutespriorvalue.getMinutes();
    NSOA.meta.log('debug', 'Get recent purchases started..');
    var readRequest = [], resultsJSON, resultsArray_JSON = [], testarray = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var picriteria = new NSOA.record.oaPurchase_item();
    picriteria.rebillablePurchase__c = "1";    
    while (limitReached === false) {

        readRequest[0] = {
            type: "Purchase_item",
            fields: "id, projectid, productid, currency, cost, date, quantity, total, userid, name, um, project_taskid",
            method: "equal to",
            objects: [picriteria, datenewer],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize
            },            
            {
                name : 'filter',
                value : 'newer-than'
            },
            {
                name : 'field',
                value : 'updated'
           }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    project: o.projectid,
                    product: o.productid,
                    currency: o.currency,
                    cost: o.cost,
                    date: o.date,
                    quantity: o.quantity,
                    total: o.total,
                    user: o.userid,
                    type: "P",
                    name: o.name
                    
                };
                testarray.push(resultsJSON);
                var obj = new NSOA.record.oaSlip();
                obj.cost = o.cost;
                obj.date = o.date;
                obj.customChargeExternal__c = o.id;
                obj.projectid = o.projectid;
                obj.currency = o.currency;
                obj.description = o.name;
                obj.productid=o.productid;
                obj.quantity=o.quantity;
                obj.unitm =o.um;
                obj.type = 'P';
                obj.userid = o.userid;
                obj.projecttaskid  = o.project_taskid;
                obj.total = o.total;
                obj.categoryid = 17;
                resultsArray_JSON.push(obj);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   	NSOA.meta.log('debug', JSON.stringify(testarray));
    return resultsArray_JSON;
}

function upsert_charges(array){
    NSOA.meta.log('debug', 'Upsert process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        //var objarray = [];
        //for (var j=0;j<searcharrays[i].length;j++){
           // var newslip = new NSOA.record.oaSlip();
    		//newslip.id = searcharrays[i][j].id;
           // newslip.rev_cat__c = searcharrays[i][j].rev_cat;
           // newslip.rev_group__c = searcharrays[i][j].rev_group;
           // newslip.brScriptProcessed__c = '1';
           // objarray.push(newslip);

        //}
        //NSOA.meta.log('debug', 'Slip Objarray after for: '+ JSON.stringify(objarray));
        var attribute = [{
            name : 'lookup',
            value : 'customChargeExternal__c'
        },{name: "update_custom", value: "1"}];
		var results = NSOA.wsapi.upsert(attribute, searcharrays[i]);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + 'array has been processed...');
        }

    }
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i].property === searchTerm) return i;
    }
    return -1;
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