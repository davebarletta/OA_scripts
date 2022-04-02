function main() {
    var pbgarray = find_pbgs();
    NSOA.meta.log('debug', 'Found ' + pbgarray.length + ' pbgs recently updated... ');
    var tasks = get_tasks(pbgarray);
    NSOA.meta.log('debug', 'Found ' + tasks.length + ' tasks for this project.');
    var pbts = get_pbts(tasks);
    NSOA.meta.log('debug', 'Task updates to make '+ JSON.stringify(pbts));
    var upresults = perform_upsert(pbts);

}

function find_pbgs(){
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
    NSOA.meta.log('debug', 'Get recent pbgs started..');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var pbgcriteria = new NSOA.record.oaProjectBudgetGroup();
    pbgcriteria.approval_status = "O";    
    while (limitReached === false) {

        readRequest[0] = {
            type: "ProjectBudgetGroup",
            fields: "id, projectid",
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

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
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
                        project: o.projectid
                    };
                    alltasks.push(resultsJSON);
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }

    }
    return alltasks;
}
function get_pbts(array){
    var datelib = require('date_utils');
    var pbtupds = [];
    var objsforupd = [];
    for(var i =0; i<array.length; i++){
        var sumarray = [];
        var readRequest = [], resultsJSON, resultsArray_JSON = [];
        var increment = 0, pageSize = 1000, limitReached = false;
        var pbt = new NSOA.record.oaProjectBudgetTransaction();
        pbt.projectid =array[i].project;
        pbt.project_taskid = array[i].id;
        pbt.category= '3';
        while (limitReached === false) {

            readRequest[0] = {
                type: "ProjectBudgetTransaction",
                fields: "id, total, category, itemid, date, job_codeid, productid, projectid, project_budget_ruleid, currency, customerid,project_taskid",
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
                        taskid: o.project_taskid,
                        currency: o.currency,
                        project_budget_ruleid: o.project_budget_ruleid,
                        customer: o.customerid,
                        mergekey: o.productid+o.projectid+o.project_taskid
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
                		taskid: pbtupds[j].taskid,
                        currency: pbtupds[j].currency,
                        project_budget_ruleid: pbtupds[j].project_budget_ruleid,
                		customer: pbtupds[j].customerid,
                        mergekey: pbtupds[j].mergekey
                    };
            objsforupd.push(taskJSON);
        }else{objsforupd[unique].total = Number(objsforupd[unique].total) + Number(pbtupds[j].total);}
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
        var obj = new NSOA.record.oaProjecttaskassign();
        try{
        var cat3 = new NSOA.record.oaVendor();
        cat3.nominalCodeId__c = array[i].productid; 
        // Define the read request
        var readRequest = {
            type : 'Vendor',
            method : 'equal to', 
            fields : 'id, oaGenericId__c, cat3Value__c', 
            attributes : [{name : 'limit',value : '1'}],
            objects : [cat3]
        };
        // Invoke the read call
        var catresults = NSOA.wsapi.read(readRequest);
        //var catid = catresults[0].objects[0].cat3Value__c;
        var userid = catresults[0].objects[0].oaGenericId__c;
        
        NSOA.meta.log('debug', 'User ID: ' + userid);
            obj.userid = userid;
            }catch (error){}
        
        
        obj.externalid = String(array[i].mergekey);
        //obj.taskVendor__c = catid;
        obj.taskDirectCostForecast__c = array[i].total;
        obj.projectid = array[i].projectid;
        obj.projecttaskid = array[i].taskid;
        obj.taskassign_budgetPONum__c = array[i].total;
        var results = NSOA.wsapi.upsert(attributes, [obj]);
        NSOA.meta.log('debug', 'New Task Assign created: '+ JSON.stringify(results));
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