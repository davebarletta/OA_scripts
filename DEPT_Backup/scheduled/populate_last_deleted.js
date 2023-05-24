function main() {
    var deletedcharges = find_deleted_charges();
    if(!isEmpty(deletedcharges)){
        var chargeprojects = process_deleted_charges(deletedcharges);
    	process_projects_charge(chargeprojects);
    }else{
        NSOA.meta.log('info', 'There were no deleted charges to process');
    }
    
    var deletedtransactions = find_deleted_rev_txns();
    if(!isEmpty(deletedtransactions)){
        var txnprojects = process_deleted_txns(deletedtransactions);
    	process_projects_txn(txnprojects);
    }else{
        NSOA.meta.log('info', 'There were no deleted Revenue Transactions to process');
    }
    
    
}

function find_deleted_rev_txns(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var today = new Date(); //Variable created to capture today's date for future calculation
    var daysprior = 2;
    var dayspriorvalue = new Date(today.getTime() - (daysprior * 24 * 60 * 60 * 1000));
    NSOA.meta.log('debug', 'Days Prior Value: ' + dayspriorvalue);
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = dayspriorvalue.getDate();
    datenewer.month = (dayspriorvalue.getMonth()+1);
    datenewer.year = dayspriorvalue.getFullYear();
    datenewer.hour= dayspriorvalue.getHours();
    datenewer.second = dayspriorvalue.getSeconds();
    datenewer.minute = dayspriorvalue.getMinutes();
    var txn = new NSOA.record.oaRevenue_recognition_transaction();
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Revenue_recognition_transaction',
            fields: 'id, updated, projectid',
            method: 'equal to',
            objects: [txn, datenewer],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            },{name: 'deleted', value: '1'},{
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
            return null;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' records to process...');
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    updated: o.updated,
                    project: o.projectid
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    NSOA.meta.log('debug','Deleted Rev Txns: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function find_deleted_charges(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var today = new Date(); //Variable created to capture today's date for future calculation
    var daysprior = 2;
    var dayspriorvalue = new Date(today.getTime() - (daysprior * 24 * 60 * 60 * 1000));
    NSOA.meta.log('debug', 'Days Prior Value: ' + dayspriorvalue);
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = dayspriorvalue.getDate();
    datenewer.month = (dayspriorvalue.getMonth()+1);
    datenewer.year = dayspriorvalue.getFullYear();
    datenewer.hour= dayspriorvalue.getHours();
    datenewer.second = dayspriorvalue.getSeconds();
    datenewer.minute = dayspriorvalue.getMinutes();
    var slip = new NSOA.record.oaSlip();
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Slip',
            fields: 'id, updated, projectid',
            method: 'equal to',
            objects: [slip, datenewer],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            },{name: 'deleted', value: '1'},{
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
            return null;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' records to process...');
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    updated: o.updated,
                    project: o.projectid
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    NSOA.meta.log('debug','Deleted Charges: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function process_deleted_txns(array){
    var updatearray = [];
    var updatejson;
    for(var i =0; i< array.length; i++){
        var check = arrayObjectIndexOf(updatearray, array[i].project, "project");
        if(check != -1){
            if(updatearray[check].updated < array[i].updated){              
                updatearray[check].id = array[i].id;
                updatearray[check].updated = array[i].updated;
                updatearray[check].project = array[i].project;         
                
            }else{
                continue;
            }
        }else{
            updatejson = {
                id: array[i].id,
                updated: array[i].updated,
                project: array[i].project
            };
            updatearray.push(updatejson);
        }
    }
    NSOA.meta.log('debug','Update Array: ' + JSON.stringify(updatearray));
    return updatearray;
}

function process_deleted_charges(array){
    var updatearray = [];
    var updatejson;
    for(var i =0; i< array.length; i++){
        var check = arrayObjectIndexOf(updatearray, array[i].project, "project");
        if(check != -1){
            if(updatearray[check].updated < array[i].updated){              
                updatearray[check].id = array[i].id;
                updatearray[check].updated = array[i].updated;
                updatearray[check].project = array[i].project;         
                
            }else{
                continue;
            }
        }else{
            updatejson = {
                id: array[i].id,
                updated: array[i].updated,
                project: array[i].project
            };
            updatearray.push(updatejson);
        }
    }
    NSOA.meta.log('debug','Update Array: ' + JSON.stringify(updatearray));
    return updatearray;
}

function process_projects_txn(array){
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var newproject = new NSOA.record.oaProject();
    		newproject.id = searcharrays[i][j].project;
            newproject.prjLastRevTxnDeleted__c = searcharrays[i][j].updated;
            objarray.push(newproject);

        }
        NSOA.meta.log('debug', 'Project Objarray after for: '+ JSON.stringify(objarray));
        var attributes = [{name:"update_custom",value:"1"}];
		var results = NSOA.wsapi.modify(attributes, objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + ' array has been processed...');
        }

    }
}

function process_projects_charge(array){
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var newproject = new NSOA.record.oaProject();
    		newproject.id = searcharrays[i][j].project;
            newproject.prjLastChargeDeleted__c = searcharrays[i][j].updated;
            objarray.push(newproject);

        }
        NSOA.meta.log('debug', 'Project Objarray after for: '+ JSON.stringify(objarray));
        var attributes = [{name:"update_custom",value:"1"}];
		var results = NSOA.wsapi.modify(attributes, objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + ' array has been processed...');
        }

    }
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
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