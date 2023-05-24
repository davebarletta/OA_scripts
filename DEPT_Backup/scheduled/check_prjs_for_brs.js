function main() {
    var activeprjs = get_active_projects();
    var projectsmissingbrs = check_projects(activeprjs);
    modify_projects(projectsmissingbrs);
    NSOA.meta.log('info', 'Remaining Units: ' + NSOA.context.remainingUnits());
    NSOA.meta.log('info', 'Remaining Time: ' + NSOA.context.remainingTime());
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

function check_projects(array){
    var projectswithoutbrs = [];
    var addjson;
    for(var i =0; i<array.length; i++){
        var checkprj = search_brs(array[i].id);
        NSOA.meta.log('debug', 'Results of check: ' + checkprj);
        if(checkprj === false){
            addjson = {
                id: array[i].id,
                missingbrs: '1'
            };
            projectswithoutbrs.push(addjson);
        }else{
            addjson = {
                id: array[i].id,
                missingbrs: ''
            };
            projectswithoutbrs.push(addjson);
        }
        
    }
    NSOA.meta.log('debug', 'Projects without billing rules: ' + JSON.stringify(projectswithoutbrs));
    return projectswithoutbrs;
}

function search_brs(project){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var br_conditions = new NSOA.record.oaProjectbillingrule();
    br_conditions.projectid = project;
    br_conditions.active = '1';    
	var not_condition = new NSOA.record.oaProjectbillingrule();
    not_condition.notes = 'Template Billing Rule';
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projectbillingrule",
            fields: "id, name, active, notes",
            method: "equal to, not equal to",
            objects: [br_conditions, not_condition],
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
			//leaving this for debugging
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    name: o.name,
                    active: o.active,
                    notes: o.notes
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    NSOA.meta.log('debug','BRs returned for this project: ' + JSON.stringify(resultsArray_JSON));
    if(resultsArray_JSON.length > 0){
        return true;
    }else{
        return false;
    }
}

function modify_projects(array){
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var prjmodify = new NSOA.record.oaProject();
    		prjmodify.id = searcharrays[i][j].id;
            prjmodify.projectMissingBRs__c = searcharrays[i][j].missingbrs;
            objarray.push(prjmodify);

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