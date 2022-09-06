function main() {
    var activeprjs = get_active_projects();
    for(var i =0; i<activeprjs.length; i++){
        var bivf = get_bivf_id(activeprjs[i].id);
        var projectdet = NSOA.record.oaProject(activeprjs[i].id);
        var projectname = projectdet.name;
        if(bivf === false){   
            NSOA.meta.log('info', 'The Project: ' + projectname + ' has no Balance Incurred V Forecast Rev Rule...');
            continue;
        }else{
            NSOA.meta.log('debug', 'BIVF Details: ' + JSON.stringify(bivf));
            var open_budget = get_open_budget_id(activeprjs[i].id);
            if(open_budget === false){
                NSOA.meta.log('info', 'The Project: ' + projectname + ' has no Open Budget...');
                continue;
            }else{            
                NSOA.meta.log('debug', 'Open Budget Details: ' + JSON.stringify(open_budget));
                var total = sum_purchase_txn(open_budget[0].id);
                NSOA.meta.log('debug', 'Direct Cost Total: ' + total);
                update_bivf(activeprjs[i].id, total, bivf[0].id);
            }
        }
        
    }
}

function get_active_projects(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var project_conditions = new NSOA.record.oaProject();
    project_conditions.active = '1';    
    while (limitReached === false) {

        readRequest[0] = {
            type: "Project",
            fields: "id",
            method: "equal to",
            objects: [project_conditions],
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

function get_bivf_id(project){
    var returnarray = [];
    // Create the issue object
    var obj = new NSOA.record.oaRevenue_recognition_rule();
    obj.projectid = project;
    obj.active = "1";
    obj.type = "B";
    // Define the read request
    var readRequest = {
        type : 'Revenue_recognition_rule',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, extra_data, type', // specify fields to be returned
        attributes : [{name : 'limit', value : '1'}],
        objects : [obj]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    var check = isEmpty(results[0].objects);
    if(check === false){
        var json = {
            id: results[0].objects[0].id,
            purchasetotal: results[0].objects[0].extra_data,
            type: results[0].objects[0].type
        };
        returnarray.push(json);
    }else{
        return false;
    }
    return returnarray;

}

function get_open_budget_id(project){
    var returnarray = [];
    // Create the issue object
    var obj = new NSOA.record.oaProjectBudgetGroup();
    obj.projectid = project;
    obj.approval_status  = "O";
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetGroup',
        method : 'equal to', // return only records that match search criteria
        fields : 'id', // specify fields to be returned
        attributes : [{name : 'limit', value : '1'}],
        objects : [obj]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    var check = isEmpty(results[0].objects);
    if(check === false){
        var json = {
            id: results[0].objects[0].id
        };
        returnarray.push(json);
    }else{
        return false;
    }
    return returnarray;
}

function sum_purchase_txn(budget){
    var readRequest = [];
    var sumtotal = 0;
    var increment = 0, pageSize = 1000, limitReached = false;
    var obj = new NSOA.record.oaProjectBudgetTransaction();
    obj.category = '3'; 
    obj.project_budget_groupid = budget;
    while (limitReached === false) {

        readRequest[0] = {
            type: "ProjectBudgetTransaction",
            fields: "id, total",
            method: "equal to",
            objects: [obj],
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
				sumtotal = sumtotal + Number(o.total);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return sumtotal;
}

function update_bivf(project, total, bivf){
    var extradata = "$h->{extra_data} = {\u000a 'base_calc' => 'B',\u000a 'cutoff_projections' => '1',\u000a 'denominator_labor_future' => 'TB',\u000a 'denominator_labor_past' => 'TB',\u000a 'fore_expense_total' => '',\u000a 'fore_purchase_total' => "+total + ",\u000a 'inc_approved_ticket' => '',\u000a 'inc_fulfilled_purchase_items' => 'on',\u000a 'include_bookings' => '',\u000a 'pivot_date' => 'Current accounting period',\u000a 'project_id' => '"+project+"',\u000a 'trueup_per_user' => '0'\u000a };\u000a";
    var obj = new NSOA.record.oaRevenue_recognition_rule();
	obj.id = bivf;
    obj.extra_data = extradata;
    // No attributes required
    var attributes = [];
    // Invoke the modify call
    var results = NSOA.wsapi.modify(attributes, [obj]);
    NSOA.meta.log('debug', 'Planned cost Update Result: ' + JSON.stringify(results));
    return;
    
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