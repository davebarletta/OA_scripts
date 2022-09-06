function main() {
    NSOA.wsapi.disableFilterSet(true);
    var pbgarray = find_pbgs();
    NSOA.meta.log('debug', 'Found ' + pbgarray.length + ' pbgs recently updated... ');
    var tasks = get_tasks(pbgarray);
    NSOA.meta.log('debug', 'Found ' + tasks.length + ' tasks for this project.');
    var pbts = get_pbts(tasks);
    NSOA.meta.log('debug', 'Task updates to make '+ JSON.stringify(pbts));
    var createbudgets = create_upsert(pbts);
    NSOA.wsapi.disableFilterSet(false);


}

function find_pbgs(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 20;
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
    var pbgcriteria = new NSOA.record.oaProjectBudgetGroup();
    pbgcriteria.approval_status = "O";    
    while (limitReached === false) {

        readRequest[0] = {
            type: "ProjectBudgetGroup",
            fields: "id, projectid, status, approved",
            method: "equal to",
            objects: [pbgcriteria, datenewer],
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
		NSOA.meta.log('debug', 'PBG Read' + JSON.stringify(resultsArray));
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                //Might be able to save performance and not delete here, but it is only just incase a situation arises where an entire months cost shifts to another month... upserts are being performed below so it would not know to delete. So here it clears all of the forecast charges before creating the latest values.
                NSOA.meta.log('debug', 'Performing Delete Operations for ' + String(o.projectid));
                var recordstodelete = find_current_forecast_charges(o.projectid);
                var deletestatus = delete_current_slips(recordstodelete);
                resultsJSON = {
                    id: o.id,
                    project: o.projectid
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    for (var i = 0; i<resultsArray_JSON; i++){
        NSOA.meta.log('debug', 'Performing Delete Operations for ' + resultsArray_JSON[i].project);
        var recordstodelete = find_current_forecast_charges(resultsArray_JSON[i].project);
        var deletestatus = delete_current_slips(recordstodelete);
        NSOA.meta.log('debug', 'Current slips process status for project ' + resultsArray_JSON[i].project + ' = ' + deletestatus);
    }
   
    return resultsArray_JSON;
}

function get_tasks(array){
    var alltasks =[];
    for(var i =0; i<array.length; i++){
        var readRequest = [], resultsJSON, resultsArray_JSON = [];
        var increment = 0, pageSize = 1000, limitReached = false;
        var task = new NSOA.record.oaProjecttask();
        task.projectid =array[i].project;
        task.classification = "T";
		task.is_a_phase = '0';
        while (limitReached === false) {

            readRequest[0] = {
                type: "Projecttask",
                fields: "id, projectid",
                method: "equal to",
                objects: [task],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
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
                        pbg: array[i].id
                    };
                    alltasks.push(resultsJSON);
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }

    }
    NSOA.meta.log('debug', 'All Tasks Array: ' + alltasks);
    return alltasks;
}
function get_pbts(array){
    var datelib = require('date_utils');
    var pbtupds = [];
    var objsforupd = [];
    for(var i =0; i<array.length; i++){
        NSOA.meta.log('debug', 'Get PBT Variables, Project:' + array[i].project + ' Task: '+ array[i].id + ' PBG: ' + array[i].pbg);
        var sumarray = [];
        var readRequest = [], resultsJSON, resultsArray_JSON = [];
        var increment = 0, pageSize = 1000, limitReached = false;
        var pbt = new NSOA.record.oaProjectBudgetTransaction();
        pbt.projectid = array[i].project;
        pbt.project_taskid = array[i].id;
        pbt.project_budget_groupid = array[i].pbg;
        while (limitReached === false) {

            readRequest[0] = {
                type: "ProjectBudgetTransaction",
                fields: "id, total, category, itemid, date, job_codeid, productid, projectid, project_budget_ruleid, currency, customerid, project_budget_groupid",
                method: "equal to",
                objects: [pbt],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
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
                        category: o.category,
                        itemid: o.itemid,
                        date: o.date,
                        job_codeid: o.job_codeid,
                        productid: o.productid,
                        projectid: o.projectid,
                        currency: o.currency,
                        project_budget_ruleid: o.project_budget_ruleid,
                        customer: o.customerid,
                        pbg: o.project_budget_groupid,
                        mergekey: o.category+o.projectid+o.date.substr(0, 7)
                    };
                    pbtupds.push(resultsJSON);
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }

    }
    for(var j = 0; j<pbtupds.length; j++){
        var unique = objsforupd.map(function(e) { return e.mergekey; }).indexOf(pbtupds[j].mergekey);
        if(unique === -1){
            var taskJSON= {
                        id: pbtupds[j].id,
                        total: pbtupds[j].total,
                        category: pbtupds[j].category,
                        itemid: pbtupds[j].itemid,
                        date: pbtupds[j].date,
                        job_codeid: pbtupds[j].job_codeid,
                        productid: pbtupds[j].productid,
                        projectid: pbtupds[j].projectid,
                        currency: pbtupds[j].currency,
                        project_budget_ruleid: pbtupds[j].project_budget_ruleid,
                		customer: pbtupds[j].customerid,
                		pbg: pbtupds[j].pbg,
                        mergekey: pbtupds[j].mergekey
                    };
            objsforupd.push(taskJSON);
        }else{objsforupd[unique].total = Number(objsforupd[unique].total) + Number(pbtupds[j].total);}
    }
    for (var k =0; k< objsforupd.length; k++){
        create_total_monthly_budget(objsforupd[k]);
    }
    return objsforupd;
}

function create_upsert(array){
    var PO = NSOA.context.getParameter('forecastPOchargestage');
    var time = NSOA.context.getParameter('forecastTIMEchargestage');
    var upsertarray = [];
    for(var i=0;i<array.length;i++){ 
        var obj = new NSOA.record.oaSlip();
        obj.name = array[i].mergekey;
        obj.date = array[i].date;
        obj.projectid = array[i].projectid;
        obj.total = array[i].total;
        obj.cost = array[i].total;
        obj.type = 'F';
        obj.customChargeExternal__c = array[i].mergekey;
        if(array[i].category == '1'){
            obj.slip_stageid = time;
        }else{obj.slip_stageid = PO;}
        var attribute = [{
            name : 'lookup',
            value : 'customChargeExternal__c'
        },{name: "update_custom", value: "1"}];

        // Invoke the upsert call
        var upsresults = NSOA.wsapi.upsert(attribute, [obj]);
        NSOA.meta.log('debug',JSON.stringify(upsresults));
        
    }
    return;
}

function find_current_forecast_charges(project){
    var PO = NSOA.context.getParameter('forecastPOchargestage');
    var time = NSOA.context.getParameter('forecastTIMEchargestage');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var poslip = new NSOA.record.oaSlip();
    poslip.projectid = project;
    poslip.slip_stageid = PO;
	var timeslip = new NSOA.record.oaSlip();
    timeslip.projectid = project;
    timeslip.slip_stageid = time;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip",
            fields: "id",
            method: "equal to, or equal to",
            objects: [poslip, timeslip],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
		NSOA.meta.log('debug', 'Status of read: ' + JSON.stringify(resultsArray));
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    NSOA.meta.log('debug', 'Records to be purged: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function delete_current_slips(array){
    var deletearray = [];
    if(!isEmpty(array)){
        for(var i =0; i<array.length; i++){
            var obj = new NSOA.record.oaSlip();
            obj.id = array[i].id;
            deletearray.push(obj);
        }
        var results = NSOA.wsapi.delete(deletearray);
        return true;
    }else{NSOA.meta.log('debug', 'No prior entries found for this budget');return false;}
}

function create_total_monthly_budget(pbt){
    // Get the total forecasted budget amount
    var pbg = new NSOA.record.oaProjectBudgetGroup();
    pbg.id = pbt.pbg;
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetGroup',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, date, total_calculated_cost, currency', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [pbg]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'result for pbg: '+ JSON.stringify(results));
    //Upsert the Budget
    var obj = new NSOA.record.oaSlip();
    var attribute = [{
            name : 'lookup',
            value : 'custTotalExt__c'
        },{name: "update_custom", value: "1"}];
    obj.custTotalExt__c = pbt.mergekey;
    obj.type = 'F';
    obj.slip_stageid = 9;
    obj.projectid = pbt.projectid;
    obj.currency = results[0].objects[0].currency;
    obj.total = results[0].objects[0].total_calculated_cost;
    obj.cost = results[0].objects[0].total_calculated_cost;
    obj.date = pbt.date;
    obj.description = 'Each of these is the total forecast budget, just for use in reporting...';
    var upsresults = NSOA.wsapi.upsert(attribute, [obj]);
    NSOA.meta.log('debug','Budget Update Results: ' + JSON.stringify(upsresults));
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