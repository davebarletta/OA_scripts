function main() {
    var activeprjs = get_active_projects();
    var projectsmissingrrs = check_projects(activeprjs);
    modify_projects(projectsmissingrrs);
    NSOA.meta.log('info', 'Remaining Units: ' + NSOA.context.remainingUnits());
    NSOA.meta.log('info', 'Remaining Time: ' + NSOA.context.remainingTime());
}

function get_active_projects(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var project_conditions = new NSOA.record.oaProject();
    project_conditions.active = '1';    
	
    var not = new NSOA.record.oaProject();
    not.prjIgnoredForMissingRevRule__c = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: "Project",
            fields: "id",
            method: "equal to, not equal to",
            objects: [project_conditions, not],
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
    var projectswithoutrrs = [];
    var addjson;
    for(var i =0; i<array.length; i++){
        var checkprj = search_rrs(array[i].id);
        NSOA.meta.log('debug', 'Results of check: ' + checkprj);
        if(checkprj === false){
            addjson = {
                id: array[i].id,
                missingrrs: '1'
            };
            projectswithoutrrs.push(addjson);
        }else{
            addjson = {
                id: array[i].id,
                missingrrs: ''
            };
            projectswithoutrrs.push(addjson);
        }
        
    }
    NSOA.meta.log('debug', 'Projects without rev rec rules: ' + JSON.stringify(projectswithoutrrs));
    return projectswithoutrrs;
}

function search_rrs(project){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var rr_conditions = new NSOA.record.oaRevenue_recognition_rule();
    rr_conditions.projectid = project;
    rr_conditions.active = '1';    
    while (limitReached === false) {

        readRequest[0] = {
            type: "Revenue_recognition_rule",
            fields: "id, name, active, notes",
            method: "equal to",
            objects: [rr_conditions],
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
    NSOA.meta.log('debug','RRs returned for this project: ' + JSON.stringify(resultsArray_JSON));
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
            prjmodify.projectMissingRRs__c = searcharrays[i][j].missingrrs;
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