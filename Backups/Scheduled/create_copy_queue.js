function main() {
    var recordsinqueue = check_queue();
    var uniqueprojects = unique_projects(recordsinqueue);
    NSOA.meta.log('debug', JSON.stringify(recordsinqueue));
    var tasks = set_top_parent(recordsinqueue);
    NSOA.meta.log('debug', 'Tasks: ' + JSON.stringify(tasks));
    for (var i = 0; i < recordsinqueue.length; i++) {
        var copyfromtasks = get_tasks_by_top(recordsinqueue[i].copyFrom);
        var copytotasks = get_tasks_by_top(recordsinqueue[i].copyTo);
        NSOA.meta.log('debug', 'Tasks to copy from: ' + JSON.stringify(copyfromtasks) + ' Tasks to copy to: ' + JSON.stringify(copytotasks));
        //Need to loop through copy from tasks and then get the associated budget records. Then need to create the PBR and PBT for the current 'Open' Project budget on copy to project
        var fullcopy = blend_arrays(copytotasks, copyfromtasks);
        NSOA.meta.log('debug', 'Array with both IDs: ' + JSON.stringify(fullcopy));
        var copy = clone_budget_records(fullcopy, uniqueprojects);
        NSOA.meta.log('debug', JSON.stringify(copy));        
    }
    var deletequeue = delete_queue(recordsinqueue);
}

function delete_queue(array){
    for (var i = 0; i<array.length; i++){
        var issue = new NSOA.record.oaIssue();
        issue.id = array[i].id;
        // Invoke the delete call
        var results = NSOA.wsapi.delete([issue]);
    }
    return;
        
}
    


function clone_budget_records(array, uniquearray) {
    var pbrarray = [];
    var pbrjson;
    for (var j = 0; j < uniquearray.length; j++){
        var frompbg = new NSOA.record.oaProjectBudgetGroup();
        frompbg.approval_status = 'O';
        frompbg.projectid = array[j].fromPrj;
        // Define the read request
        var frompbgreadRequest = {
            type: 'ProjectBudgetGroup',
            method: 'equal to', // return only records that match search criteria
            fields: 'id', // specify fields to be returned
            attributes: [{name: 'limit', value: '1'}],
            objects: [frompbg]
        };
        // Invoke the read call
        var frompbgresults = NSOA.wsapi.read(frompbgreadRequest);
        var frompbgid = frompbgresults[0].objects[0].id;
        var topbg = new NSOA.record.oaProjectBudgetGroup();
        topbg.approval_status = 'O';
        topbg.projectid = array[j].project;
        var projectstart = get_prj_start(uniquearray[j]);
        // Define the read request
        var topbgreadRequest = {
            type: 'ProjectBudgetGroup',
            method: 'equal to',
            fields: 'id', 
            attributes: [{name: 'limit', value: '1'}],
            objects: [topbg]
        };
        // Invoke the read call
        var topbgresults = NSOA.wsapi.read(topbgreadRequest);
        var topbgid = topbgresults[0].objects[0].id;
        NSOA.meta.log('debug', 'Copying from Budget: ' + frompbgid + ", To Budget: " + topbgid + " From Project: " + array[0].fromPrj + " Copy From: " + array[0].copyFrom);
        for (var i = 0; i < array.length; i++) {
            //NSOA.meta.log('debug', 'something');
            //Get Project Budget Rule for this task
            var foundpbr = find_pbr(array[0].fromPrj, array[i].copyFrom, frompbgid);
            NSOA.meta.log('debug', 'PBR for this task ' + JSON.stringify(foundpbr) + ' Task to copy to: '+ array[i].id);
            if (!foundpbr || !foundpbr[0] || !foundpbr[0].objects) {
                foundpbr.forEach(function(o) {
                    /*if(arrayObjectIndexOf(pbrarray,this.id,'id'))*/
                    {
                        pbrjson = {
                            id: o.id,
                            date: o.date,
                            category: o.category,
                            categoryid: o.categoryid,
                            customerid: o.customerid,
                            enddate: o.end_date,
                            itemid: o.itemid,
                            job_codeid: o.job_codeid,
                            notes: o.notes,
                            period: o.period,
                            productid: o.productid,
                            project_taskid: array[i].id,
                            projectid: array[i].project,
                            quantity: o.quantity,
                            rate: o.rate,
                            start_date: o.start_date,
                            total: o.total
                        };
                        var clonedrule = new NSOA.record.oaProjectBudgetRule();
                        clonedrule.id = o.id;
                        clonedrule.date = projectstart;
                        clonedrule.category = o.category;
                        clonedrule.categoryid = o.categoryid;
                        //clonedrule.enddate = o.end_date;
                        clonedrule.itemid = o.itemid;
                        clonedrule.job_codeid = o.job_codeid;
                        clonedrule.notes = o.notes;
                        clonedrule.period = o.period;
                        clonedrule.productid = o.productid;
                        clonedrule.project_taskid = array[i].id;
                        clonedrule.projectid = array[i].project;
                        clonedrule.quantity = o.quantity;
                        clonedrule.rate = o.rate;
                        //clonedrule.start_date = o.start_date;
                        clonedrule.total = o.total;
                        clonedrule.project_budget_groupid = topbgid;
                        clonedrule.customerid = array[i].customer;
                        // Invoke the add call
                        var ruleresults = NSOA.wsapi.add([clonedrule]);
                        // Get the new ID
                        var ruleid = ruleresults[0].id;
                        NSOA.meta.log('debug', 'Rule clone result: '+ JSON.stringify(ruleresults));
                        var pbts = find_pbts(this.id,frompbgid,array[i].copyFrom,array[i].fromPrj,array[i].project,array[i].id,ruleid,topbgid,array[i].customer);
                        NSOA.meta.log('debug', 'The PBTs to copy for this rule: ' + JSON.stringify(pbts));
                        // Invoke the add call
                        var txnresults = NSOA.wsapi.add(pbts);
                        NSOA.meta.log('debug', 'PBT add results: ' + JSON.stringify(txnresults));
                        // Get the new ID
                        var txnid = txnresults[0].id;
                        pbrarray.push(pbrjson);
                    }
                    //else{NSOA.meta.log('debug', 'No value to add...');}
                });
            } else {
                //pbrarray.push(foundpbr);
            }
        }
    }
    return pbrarray;


}

function find_pbts(pbrid, pbgid, task, project, newprj, newtask, newpbr, newpbg, newcustomer){
NSOA.meta.log('debug', 'Find PBT function Started...');
    var readRequest = [],
        resultsJSON,
        resultsArray_JSON = [],
        pbtsarray = [];
    var increment = 0,
        pageSize = 1000,
        limitReached = false;
    var frompbr = new NSOA.record.oaProjectBudgetTransaction();
    frompbr.project_budget_groupid = pbgid;
    frompbr.project_taskid = task;
    frompbr.project_id = project;
    frompbr.project_budget_ruleid = pbrid; 
    NSOA.meta.log('debug', 'PBG - ' + pbgid + ' Task - ' + task + ' Project - ' + project);
    var projectstart = get_prj_start(newprj);
    while (limitReached === false) {

        readRequest[0] = {
            type: "ProjectBudgetTransaction",
            fields: "id, date,category,categoryid,customerid,itemid,job_codeid,notes,period,productid,project_taskid,projectid,quantity,rate,total, project_budget_ruleid",
            method: "equal to",
            objects: [frompbr],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            NSOA.meta.log('debug', 'Unexpected error');
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
            NSOA.meta.log('debug', 'PBT errors: ' + resultsArray[0].errors);
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function(o) {
                resultsJSON = {
                    id: o.id,
                    date: o.date,
                    category: o.category,
                    categoryid: o.categoryid,
                    customerid: o.customerid,
                    itemid: o.itemid,
                    job_codeid: o.job_codeid,
                    notes: o.notes,
                    period: o.period,
                    productid: o.productid,
                    project_taskid: o.project_taskid,
                    projectid: o.projectid,
                    quantity: o.quantity,
                    rate: o.rate,
                    total: o.total
                };
                resultsArray_JSON.push(resultsJSON);
                var pbttoclone = new NSOA.record.oaProjectBudgetTransaction();
                pbttoclone.date = projectstart;
                pbttoclone.category = o.category;
                pbttoclone.categoryid = o.categoryid;
                pbttoclone.itemid = o.itemid;
                pbttoclone.job_codeid = o.job_codeid;
                pbttoclone.notes = o.notes;
                pbttoclone.period = o.period;
                pbttoclone.productid = o.productid;
                pbttoclone.project_taskid = newtask;
                pbttoclone.projectid = newprj;
                pbttoclone.quantity = o.quantity;
                pbttoclone.rate = o.rate;
                pbttoclone.total = o.total;
                pbttoclone.project_budget_ruleid = newpbr;
                pbttoclone.project_budget_groupid = newpbg;
                pbttoclone.customerid = newcustomer;
                pbtsarray.push(pbttoclone);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }

    return pbtsarray;


}

function unique_projects(array){
    var returnarray = [];
    for(var i = 0; i < array.length; i++){
        if(i === 0){
            returnarray.push(array[i].project);
        }else if(arrayObjectIndexOf(returnarray, array[i].project, "project") === -1){
            returnarray.push(array[i].project);
        }else{continue;}
    }
    return returnarray;
    
}

function find_pbr(project, task, pbg) {
    NSOA.meta.log('debug', 'Find PBR function Started...');
    var readRequest = [],
        resultsJSON,
        resultsArray_JSON = [];
    var increment = 0,
        pageSize = 1000,
        limitReached = false;
    var frompbr = new NSOA.record.oaProjectBudgetRule();
    frompbr.project_budget_groupid = pbg;
    frompbr.project_taskid = task;
    frompbr.project_id = project;
    NSOA.meta.log('debug', 'PBG - ' + pbg + ' Task - ' + task + ' Project - ' + project);
    while (limitReached === false) {

        readRequest[0] = {
            type: "ProjectBudgetRule",
            fields: "id, date,category,categoryid,customerid,end_date,itemid,job_codeid,notes,period,productid,project_taskid,projectid,quantity,rate,start_date,total",
            method: "equal to",
            objects: [frompbr],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            NSOA.meta.log('debug', 'Unexpected error');
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
            NSOA.meta.log('debug', 'PBR errors: ' + resultsArray[0].errors);
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function(o) {
                resultsJSON = {
                    id: o.id,
                    date: o.date,
                    category: o.category,
                    categoryid: o.categoryid,
                    customerid: o.customerid,
                    enddate: o.end_date,
                    itemid: o.itemid,
                    job_codeid: o.job_codeid,
                    notes: o.notes,
                    period: o.period,
                    productid: o.productid,
                    project_taskid: o.project_taskid,
                    projectid: o.projectid,
                    quantity: o.quantity,
                    rate: o.rate,
                    start_date: o.start_date,
                    total: o.total
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    //NSOA.meta.log('debug', 'Array holding Start Date: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function check_queue() {
    var readRequest = [],
        resultsJSON, resultsArray_JSON = [];
    var increment = 0,
        pageSize = 1000,
        limitReached = false;
    var copy_queue_id = NSOA.context.getParameter('copy_queue_id');
    var queue = new NSOA.record.oaIssue();
    queue.issue_category_id = copy_queue_id;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Issue",
            fields: "id, project_id, copyFrom__c, copyTo__c",
            method: "equal to",
            objects: [queue],
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

            resultsArray[0].objects.forEach(function(o) {
                resultsJSON = {
                    id: o.id,
                    project: o.project_id,
                    copyFrom: o.copyFrom__c,
                    copyTo: o.copyTo__c
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    NSOA.meta.log('debug', 'Queue Results: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function set_top_parent(array) {
    var attributes = [{
        name: "update_custom",
        value: "1"
    }];
    var resultsJSON, resultsArray_JSON = [];
    var projectarray = [];
    for (var i = 0; i < array.length; i++) {
        projectarray.push(array[i].project);
    }
    for (var a = 0; a < projectarray.length; a++) {
        var ptask = new NSOA.record.oaProjecttask();
        ptask.projectid = projectarray[a];
        ptask.classification = 'T';
        ptask.is_a_phase = '0';
        // Define the read request
        var readRequest = {
            type: 'Projecttask',
            method: 'equal to',
            fields: 'id, name, parentid',
            attributes: [{
                name: 'limit',
                value: '1000'
            }],
            objects: [
                ptask
            ]
        };
        // Invoke the read call
        var results = NSOA.wsapi.read(readRequest);
        NSOA.meta.log('debug', 'Set Top Results: ' + JSON.stringify(results));
        for (var b = 0; b < results[0].objects.length; b++) {
            NSOA.meta.log('debug', 'Task ID: ' + results[0].objects[b].id + ' Parent: ' + results[0].objects[b].parentid);
            var firstcheck = check_parent(results[0].objects[b].parentid);
            NSOA.meta.log('debug', 'First Check Parent: ' + firstcheck[0].parent + ' First Check ID: ' + firstcheck[0].id);
            if (firstcheck[0].parent !== '0') {
                var secondcheck = check_parent(firstcheck[0].parent);
                var modtask2 = new NSOA.record.oaProjecttask();
                modtask2.id = results[0].objects[b].id;
                modtask2.topParentId__c = secondcheck[0].id;
                // Invoke the modify call
                var modtask2results = NSOA.wsapi.modify(attributes, [modtask2]);

            } else {
                var modtask = new NSOA.record.oaProjecttask();
                modtask.id = results[0].objects[b].id;
                modtask.topParentId__c = firstcheck[0].id;
                // Invoke the modify call
                var modtaskresults = NSOA.wsapi.modify(attributes, [modtask]);
            }
        }
        results[0].objects.forEach(function(o) {
            resultsJSON = {
                id: o.id,
                parent: o.parentid,
                name: o.name
            };
            resultsArray_JSON.push(resultsJSON);
        });
        return resultsArray_JSON;
    }
}

function check_parent(record) {
    var readRequest = [],
        resultsJSON, resultsArray_JSON = [];
    var increment = 0,
        pageSize = 1000,
        limitReached = false;
    var ptasks = new NSOA.record.oaProjecttask();
    ptasks.id = record;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projecttask",
            fields: "id, parentid",
            method: "equal to",
            objects: [ptasks],
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

            resultsArray[0].objects.forEach(function(o) {
                resultsJSON = {
                    id: o.id,
                    parent: o.parentid
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }

    return resultsArray_JSON;
}

function get_prj_start(id){
    var prj = new NSOA.record.oaProject();
    prj.id = id;
    // Define the read request
    var readRequest = {
        type : 'Project',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, start_date', // specify fields to be returned
        attributes : [{name : 'limit', value : '1'}],
        objects : [prj]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    return results[0].objects[0].start_date;

}

function get_tasks_by_top(topparent) {
    var readRequest = [],
        resultsJSON, resultsArray_JSON = [];
    var increment = 0,
        pageSize = 1000,
        limitReached = false;
    var ptasks = new NSOA.record.oaProjecttask();
    ptasks.topParentId__c = topparent;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projecttask",
            fields: "id, name, projectid, customerid",
            method: "equal to",
            objects: [ptasks],
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

            resultsArray[0].objects.forEach(function(o) {
                resultsJSON = {
                    id: o.id,
                    name: o.name,
                    project: o.projectid,
                    customer: o.customerid,
                    fromPrj: '',
                    copyFrom: ''
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }

    return resultsArray_JSON;

}

function blend_arrays(arr1, arr2) {
    NSOA.meta.log('debug', 'Blend Arrays started');
    for (var i = 0; i < arr1.length; i++) {
        for (var j = 0; j < arr2.length; j++) {
            if (arr1[i].name === arr2[j].name) {
                arr1[i].copyFrom = arr2[j].id;
                arr1[i].fromPrj = arr2[j].project;
                //NSOA.meta.log('debug','Records Matched.');
                break;
            } else { //NSOA.meta.log('debug', 'arr1: '+ arr1[i].brid +' arr2: '+ arr2[j].id + ', '+ arr2[j].rev_cat);
                continue;
            }
            continue;
        }
    }
    return arr1;
}

function check_where_parent(record) {
    var readRequest = [],
        resultsJSON, resultsArray_JSON = [];
    var increment = 0,
        pageSize = 1000,
        limitReached = false;
    var ptasks = new NSOA.record.oaProjecttask();
    ptasks.parentid = record;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projecttask",
            fields: "id, parentid",
            method: "equal to",
            objects: [ptasks],
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

            resultsArray[0].objects.forEach(function(o) {
                resultsJSON = {
                    id: o.id
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }

    return resultsArray_JSON;

}

function splitArrayIntoChunksOfLen(arr, len) {
    var chunks = [],
        i = 0,
        n = arr.length;
    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }
    return chunks;
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for (var i = 0, len = myArray.length; i < len; i++) {
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