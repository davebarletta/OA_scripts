function main() {
    var poarray = find_pos();
    NSOA.meta.log('debug', 'Found ' + poarray.length + ' pos recently updated... ');
    NSOA.meta.log('debug', JSON.stringify(poarray));
    var upresults = perform_upsert(poarray);

}

function find_pos(){
    var poupds = [];
    var objsforupd = [];
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 300;
    var minutespriorvalue = new Date(today.getTime() - (minutesprior * 60 * 1000));
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = minutespriorvalue.getDate();
    datenewer.month = (minutespriorvalue.getMonth()+1);
    datenewer.year = minutespriorvalue.getFullYear();
    datenewer.hour= minutespriorvalue.getHours();
    datenewer.second = minutespriorvalue.getSeconds();
    datenewer.minute = minutespriorvalue.getMinutes();
    NSOA.meta.log('debug', 'Get recent pbgs started..');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var pocriteria = new NSOA.record.oaPurchase_item();
    pocriteria.netsuite_request_item_id__c = "";    
    while (limitReached === false) {

            readRequest[0] = {
                type: "Purchase_item",
                fields: "id, productid, projectid, project_taskid, total, vendorid",
                method: "not equal to",
                objects: [pocriteria, datenewer],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
                },{
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
                        total: o.total,
                        productid: o.productid,
                        projectid: o.projectid,
                        taskid: o.project_taskid,
                        currency: o.currency,
                        customer: o.customerid,
                        vendor: o.vendorid,
                        mergekey: o.projectid+o.project_taskid
                    };
                    poupds.push(resultsJSON);
                    NSOA.meta.log('debug', JSON.stringify(poupds));
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }

    for(var j = 0; j<poupds.length; j++){
        var unique = objsforupd.map(function(e) { return e.mergekey; }).indexOf(poupds[j].mergekey);
        if(unique === -1){
            var taskJSON= {
                        id: poupds[j].id,
                        total: poupds[j].total,
                        productid: poupds[j].productid,
                        projectid: poupds[j].projectid,
                		taskid: poupds[j].taskid,
                        currency: poupds[j].currency,
                		customer: poupds[j].customerid,
                		vendor: poupds[j].vendor,
                        mergekey: poupds[j].mergekey
                    };
            objsforupd.push(taskJSON);
        }else{objsforupd[unique].total = Number(objsforupd[unique].total) + Number(poupds[j].total);}
    }
    return objsforupd;
}


function perform_upsert(array){
    var attributes = [{
         name : "lookup",
         value : "externalid"
         },
         {name: "update_custom", value: "1"}];

    for(var i=0;i<array.length;i++){    
        var cat3 = new NSOA.record.oaVendor();
        cat3.id = array[i].vendor; 
        // Define the read request
        var readRequest = {
            type : 'Vendor',
            method : 'equal to', 
            fields : 'id, oaGenericId__c, cat3Value__c, nominalCodeId__c, taskassign_openPONum__c, taskassign_actualPONum__c', 
            attributes : [{name : 'limit',value : '1'}],
            objects : [cat3]
        };
        // Invoke the read call
        var catresults = NSOA.wsapi.read(readRequest);
        var catid = catresults[0].objects[0].cat3Value__c;
        var userid = catresults[0].objects[0].oaGenericId__c;
        var nominalcode = catresults[0].objects[0].nominalCodeId__c;
        NSOA.meta.log('debug', 'User ID: ' + userid);
        var obj = new NSOA.record.oaProjecttaskassign();
        obj.userid = userid;
        obj.actualPOVariance__c = Number(catresults[0].objects[0].taskassign_openPONum__c) - Number(catresults[0].objects[0].taskassign_actualPONum__c); // Added for Calculation of Open - Actual Variance
        obj.externalid = nominalcode + array[i].mergekey;
        obj.taskVendor__c = catid;
        obj.taskassignPOActual__c = array[i].total;
        obj.projectid = array[i].projectid;
        obj.projecttaskid = array[i].taskid;
        obj.taskassign_actualPONum__c = array[i].total;
        var results = NSOA.wsapi.upsert(attributes, [obj]);
        NSOA.meta.log('debug', 'Task Assign Results: '+ JSON.stringify(results));
    }
    return;
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