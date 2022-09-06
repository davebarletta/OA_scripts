function main() {
    var poarray = find_pos();
    NSOA.meta.log('debug', 'Found ' + poarray.length + ' pos recently updated... ');
    NSOA.meta.log('debug', JSON.stringify(poarray));
    var upresults = perform_upsert(poarray);
//
}

function find_pos(){
    var poupds = [];
    var objsforupd = [];
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 120; //set to 120
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
    pocriteria.project_taskid = '';
    while (limitReached === false) {

            readRequest[0] = {
                type: "Purchase_item",
                fields: "id, productid, projectid, project_taskid, total, vendorid",
                method: "not equal to",
                objects: [pocriteria, datenewer],
                attributes: [{name: "limit", value: increment + "," + pageSize},{name : 'filter', value : 'newer-than'},{name : 'field', value : 'updated'}]
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
                    };if(!isEmpty(o.project_taskid)){
                    	poupds.push(resultsJSON);
                    	NSOA.meta.log('debug', JSON.stringify(poupds));
                }
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
        var po = NSOA.record.oaPurchase_item(array[i].id);
        var obj = new NSOA.record.oaProjecttaskassign();
        //var currentbudgettotal = find_current_budget_total(po);
        var currentopentotal = find_current_open_total(po);
        var currentbudgettotal = current_total(po);
        var currentactualtotal = find_actual_po(po);
        obj.userid = 183; //Setting this to the default task assignment user
        obj.externalid = String(array[i].mergekey);
        //obj.taskVendor__c = catid;
        obj.taskassignPOOpened__c = currentopentotal;
        obj.projectid = array[i].projectid;
        obj.taskDirectCostForecast__c = currentbudgettotal;
        obj.projecttaskid = array[i].taskid;
        obj.taskassign_openPONum__c = currentopentotal;
        obj.taPoVarFromBudget__c  = Number(currentbudgettotal) - Number(currentopentotal);
        obj.taskassign_actualPONum__c = currentactualtotal;
        obj.taskassignPOActual__c = currentactualtotal;
        obj.actualPOVariance__c = Number(currentopentotal) - Number(currentactualtotal);
        var results = NSOA.wsapi.upsert(attributes, [obj]);
        NSOA.meta.log('debug', 'Current Open Total: ' + currentopentotal +  ' Current Actual Total: ' + currentactualtotal);
        NSOA.meta.log('debug', 'Task Assign Results: '+ JSON.stringify(results));
    }
    return;
}

function find_actual_po(po){
    var poupds =[];
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var pocriteria = new NSOA.record.oaPurchase_item();
    pocriteria.project_taskid = po.project_taskid;
    pocriteria.projectid = po.projectid;
    while (limitReached === false) {

            readRequest[0] = {
                type: "Purchase_item",
                fields: "id, productid, projectid, project_taskid, total, vendorid, currency",
                method: "equal to",
                objects: [pocriteria],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
                }]
            };


            var resultsArray = NSOA.wsapi.read(readRequest);

            if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
                // An unexpected error has occurred!
                return 0;
            } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
                // There are errors to handle!
            } else {
                // Process the response as expected

                resultsArray[0].objects.forEach(function (o) {
                    var project = NSOA.record.oaProject(o.projectid);
                    var prjcurrency = project.currency;
                    var convertedtotal = get_exchange_rate(prjcurrency, o.currency, o.total);
                    resultsJSON = {
                        id: o.id,
                        total: Number(o.total),
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
        var actualsum =0;
        for (var i =0; i< poupds.length; i++){
            actualsum = Number(actualsum) + Number(poupds[i].total);
        }
        NSOA.meta.log('debug', 'Current actual sum: ' + actualsum);
        return actualsum;
    
}

function find_open_pbg(prj){
    var pbg = new NSOA.record.oaProjectBudgetGroup();
    pbg.projectid  = prj;
    pbg.approval_status = "O";
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetGroup',
        method : 'equal to',
        fields : 'id, date', 
        attributes : [{name : 'limit', value : '1'}],
        objects : [pbg]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    return results[0].objects[0].id;
}

function current_total(po){
    var openpb = find_open_pbg(po.project_id);
    var currenttotal = find_current_budget_total(openpb, po);
    NSOA.meta.log('debug', 'The current forecasted total for this task: ' + currenttotal);
    return currenttotal;
}


function find_current_budget_total(pbg, po){
    var currenttotal = 0;
    var poupds = [];
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var pocriteria = new NSOA.record.oaProjectBudgetTransaction();
    pocriteria.project_taskid = po.project_taskid;
    pocriteria.projectid = po.projectid;
    pocriteria.project_budget_groupid = pbg;
    pocriteria.category = 3;
    while (limitReached === false) {

            readRequest[0] = {
                type: "ProjectBudgetTransaction",
                fields: "id, total",
                method: "equal to",
                objects: [pocriteria],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
                }]
            };


            var resultsArray = NSOA.wsapi.read(readRequest);

            if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
                // An unexpected error has occurred!
                return 0;
            } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
                // There are errors to handle!
            } else {
                // Process the response as expected

                resultsArray[0].objects.forEach(function (o) {
                    // Invoke the read call
                    resultsJSON = {
                        id: o.id,
                        total: o.total
                        
                    };
                    currenttotal = Number(currenttotal) + Number(o.total);
                    poupds.push(resultsJSON);
                    NSOA.meta.log('debug', JSON.stringify(poupds));
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }
	return currenttotal;
}

function find_current_open_total(po){
    var poupds =[];
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var pocriteria = new NSOA.record.oaIssue();
    pocriteria.issue_category_id  = 6;    //Need to update to parameter
    pocriteria.project_task_id = po.project_taskid;
    pocriteria.project_id = po.projectid;
    while (limitReached === false) {

            readRequest[0] = {
                type: "Issue",
                fields: "id, productid, project_id, project_task_id, convertedPOTotal__c, poVendor__c",
                method: "equal to",
                objects: [pocriteria],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
                }]
            };


            var resultsArray = NSOA.wsapi.read(readRequest);

            if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
                // An unexpected error has occurred!
                return 0;
            } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
                // There are errors to handle!
            } else {
                // Process the response as expected

                resultsArray[0].objects.forEach(function (o) {
                    // Invoke the read call
                    resultsJSON = {
                        id: o.id,
                        total: o.convertedPOTotal__c,
                        productid: o.productid,
                        projectid: o.project_id ,
                        taskid: o.project_task_id,
                        currency: o.currency,
                        customer: o.customerid,
                        vendor: o.poVendor__c,
                        mergekey: o.project_id+o.project_task_id 
                    };
                    poupds.push(resultsJSON);
                    NSOA.meta.log('debug', JSON.stringify(poupds));
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }
        var opensum =0;
        for (var i =0; i< poupds.length; i++){
            opensum = Number(opensum) + Number(poupds[i].total);
        }
        NSOA.meta.log('debug', 'Current open sum: ' + opensum);
        return opensum;
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
}

function get_exchange_rate(prjcurrency, ricurrency, amount){
    NSOA.meta.log('debug', 'Exchange rate details - Amount: '+ amount + ' Convert from: ' + ricurrency + ' Convert To: ' + prjcurrency);
    var url = String('https://api.exchangerate.host/convert?amount='+amount+'&from='+ricurrency+'&to='+prjcurrency);
    var response = NSOA.https.get({
        url: url  
    });
    NSOA.meta.log('debug', 'API Ex Rate Response: '+JSON.stringify(response));
    NSOA.meta.log('debug', 'The converted amount: '+response.body.result);
	return response.body.result;
    
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