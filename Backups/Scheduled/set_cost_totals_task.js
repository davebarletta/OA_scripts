function main() {
    var pbgarray = find_pbgs();
    NSOA.meta.log('debug', 'Found ' + pbgarray.length + ' pbgs recently updated... ');
    var tasks = get_tasks(pbgarray);
    NSOA.meta.log('debug', 'Found ' + tasks.length + ' tasks for this project.');
    var pbts = get_pbts(tasks);
    NSOA.meta.log('debug', 'Task updates to make '+ JSON.stringify(pbts));
    update_tasks(pbts);
}

function find_pbgs(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 180;
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
    var pbtupds = [];
    for(var i =0; i<array.length; i++){
        var sumarray = [];
        var readRequest = [], resultsJSON, resultsArray_JSON = [];
        var increment = 0, pageSize = 1000, limitReached = false;
        var pbt = new NSOA.record.oaProjectBudgetTransaction();
        pbt.projectid =array[i].project;
        pbt.project_taskid = array[i].id;
        while (limitReached === false) {

            readRequest[0] = {
                type: "ProjectBudgetTransaction",
                fields: "id, total, productid, category, projectid",
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
                        productid: o.productid,
                        projectid: o.projectid
                    };
                    resultsArray_JSON.push(resultsJSON);
                    sumarray.push(o.total);
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }
        var sumtotal = 0;
        for (var j=0; j<sumarray.length;j++){
            sumtotal = sumtotal + Number(sumarray[j]);
        }
        if(sumtotal > 0){
            var pbtjson = {
                task: array[i].id,
                project: array[i].project,
                total: sumtotal
            };
        pbtupds.push(pbtjson);
        }else{NSOA.meta.log('debug', 'No Update Required for this Task');}

    }
    return pbtupds;
}

function update_tasks(array){
    var chunks = splitArrayIntoChunksOfLen(array, 1000);
    for(var i =0; i<chunks.length; i++){
		var objarray = [];
        for (var j=0;j<chunks[i].length;j++){
            var newtask = new NSOA.record.oaProjecttask();
    		newtask.id = chunks[i][j].task;
            newtask.task_budget_cost = chunks[i][j].total;
            newtask.manual_task_budget = '1';
            objarray.push(newtask);

        }
        NSOA.meta.log('debug', 'Slip Objarray after for: '+ JSON.stringify(objarray));
        var attributes = [{name:"update_custom",value:"1"}];
		var results = NSOA.wsapi.modify(attributes, objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + 'array has been processed...');
        }

    }
    return;
}

function create_task_assigns(array){
    
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
        if (myArray[i][property] === searchTerm) return i;
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