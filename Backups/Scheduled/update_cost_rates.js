function main() {
    var costratecard = NSOA.context.getParameter('cost_rate_card_id'); 
	var currentrates = find_rates(costratecard); // You can update this line to change the ratecard
    //NSOA.meta.log('debug', 'Current rates: ' + JSON.stringify(currentrates));
    update_job_codes(currentrates); //Comment this line out if you don't want to update the LC on the Job Codes
    var activeusers = get_active_users();
    //NSOA.meta.log('debug', 'Active Users: ' + JSON.stringify(activeusers));
    var usersupdates = create_user_array(activeusers,currentrates);
    //NSOA.meta.log('debug', 'Cost Match: ' + JSON.stringify(usersupdates));
    update_lc(usersupdates, 0); // Update this line to change the lc_level to update
    
}

function find_rates(costratecard){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var rc_conditions = new NSOA.record.oaRateCardItem();
    rc_conditions.rate_card_id = costratecard;    
    while (limitReached === false) {

        readRequest[0] = {
            type: "RateCardItem",
            fields: "id, job_code_id, rate, currency",
            method: "equal to",
            objects: [rc_conditions],
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
                    jobcode: o.job_code_id,
                    rate: o.rate,
                    currency: o.currency
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function get_active_users(){
    var oldstart = NSOA.context.getParameter('cost_rate_start');
    var oldend = NSOA.context.getParameter('cost_rate_end');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var user_conditions = new NSOA.record.oaUser();
    user_conditions.active = '1'; 
    //user_conditions.id = 6; Used this line in testing to only run for my User
    while (limitReached === false) {

        readRequest[0] = {
            type: "User",
            fields: "id, job_codeid, cost, currency",
            method: "equal to",
            objects: [user_conditions],
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
                    jobcode: o.job_codeid,
                    currentrate: o.cost,
                    currentcurrency: o.currency,
                    oldstart: oldstart,
                    oldend: oldend,
                    newrate: '',
                    newcurrency: ''
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}
/*
function modify_lc0(array){
// This function needs work... the modify for the user never seems to begin. The Script just hangs and never completes when it comes to update the cost using the user table
    NSOA.wsapi.disableFilterSet(true);
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var newrate = new NSOA.record.oaUser();
    		newrate.cost = searcharrays[i][j].newrate;
            newrate.id = searcharrays[i][j].id;
            newrate.cost_lc_level = 0;
            newrate.update_cost = '1';
            newrate.cost_start_date = searcharrays[i][j].oldstart;
            newrate.cost_end_date = searcharrays[i][j].oldend;
            newrate.cost_currency = searcharrays[i][j].newcurrency;
            objarray.push(newrate);

        }
        NSOA.meta.log('debug', 'LC Objarray after for: '+ JSON.stringify(objarray));
        var attributes = [{name:"update_custom",value:"1"}];
		var results = NSOA.wsapi.upsert(attributes, objarray);
        NSOA.meta.log('debug', 'Upsert Results: '+JSON.stringify(results));
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + 'array has been processed...');
            NSOA.meta.log('debug', JSON.stringify(results));
        }
	
    }
    return true;
} */

function update_job_codes(costarray){
    var jobcodes = [];
    var today = new Date();
    for (var i = 0; i< costarray.length; i++){
        var obj = new NSOA.record.oaJobcode();
        obj.id = costarray[i].jobcode;
        obj.currency = costarray[i].currency;
        obj.loaded_cost  = costarray[i].rate;
        obj.notes = 'Job code rate last updated ' + today;
        jobcodes.push(obj);
    }
    var results = NSOA.wsapi.modify([], jobcodes);
    NSOA.meta.log('debug', 'Job code update results: ' + JSON.stringify(results));
    return true;
}

function update_lc(userarray, lclevel){
    var date_utils = require('date_utils');	
    NSOA.wsapi.disableFilterSet(true);
    var oldstart = NSOA.context.getParameter('cost_rate_start');
    var oldend = NSOA.context.getParameter('cost_rate_end');
    var startstring = date_utils.date_to_string(oldstart);
    var endstring = date_utils.date_to_string(oldend);
    /* As of right now, the OA Date is not required for this update. The fields take string values only as converted above...
    var startdate = new NSOA.record.oaDate();
    startdate.day = oldstart.getDate();
    startdate.month = (oldstart.getMonth()+1);
    startdate.year = oldstart.getFullYear();
    var enddate = new NSOA.record.oaDate();
    enddate.day = oldend.getDate();
    enddate.month = (oldend.getMonth()+1);
    enddate.year = oldend.getFullYear(); */
    var attributes = [{name : 'lookup', value : 'id'}];
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(userarray, 500);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        var updarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var currentcost = new NSOA.record.oaLoadedCost();
            currentcost.userid = searcharrays[i][j].id;
            currentcost.lc_level = lclevel;
            currentcost.current = '1';
            var readRequest = {
                type : 'LoadedCost',
                method : 'equal to', 
                fields : 'id, cost, lc_level, currency, externalid',
                attributes : [{name : 'limit', value : '1'}],
                objects : [currentcost]};
            var result = NSOA.wsapi.read(readRequest);
            NSOA.meta.log('debug','LC Read:  '+JSON.stringify(result));
            try{
                var oldcost = new NSOA.record.oaLoadedCost();
                oldcost.id = result[0].objects[0].id;
                oldcost.userid = searcharrays[i][j].id;
                oldcost.start = startstring;
                oldcost.end = endstring;
                oldcost.current = '0';
                oldcost.lc_level = lclevel;
                oldcost.cost = result[0].objects[0].cost;
                oldcost.currency = result[0].objects[0].currency;
                updarray.push(oldcost);
                var newcost = new NSOA.record.oaLoadedCost();
                newcost.userid = searcharrays[i][j].id;
                newcost.lc_level = lclevel;
                newcost.currency = searcharrays[i][j].newcurrency;
                newcost.cost = searcharrays[i][j].newrate;
                newcost.current = '1';
                newcost.externalid = String(searcharrays[i][j].id) + endstring;
                objarray.push(newcost);
                
            }catch(e){
                NSOA.meta.log('error', e);
                var firstcost = new NSOA.record.oaLoadedCost();
                firstcost.userid = searcharrays[i][j].id;
                firstcost.lc_level = lclevel;
                firstcost.currency = searcharrays[i][j].newcurrency;
                firstcost.cost = searcharrays[i][j].newrate;
                firstcost.current ='1';
                firstcost.externalid = String(searcharrays[i][j].id) + endstring;
                objarray.push(firstcost);
            }

        }
        NSOA.meta.log('debug', 'LC Objarray after for: '+ JSON.stringify(objarray));
        NSOA.meta.log('debug', 'About to perform upsert...');
		var modresults = NSOA.wsapi.modify([], updarray);
        var addresults = NSOA.wsapi.add(objarray);
        NSOA.meta.log('debug', 'Upsert Results: ' + JSON.stringify(modresults));
        NSOA.meta.log('debug', 'Add Results: ' + JSON.stringify(addresults));
         if (!modresults || !modresults[0] || !modresults[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && modresults[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + ' array has been processed...');
            NSOA.meta.log('debug', 'Modify results: ' + JSON.stringify(modresults));
            NSOA.meta.log('debug', 'Add results: ' + JSON.stringify(addresults));
        }	  
    }
    NSOA.wsapi.disableFilterSet(false);
    NSOA.meta.log('debug', 'Update ended, line before return');
    return;
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
        if (myArray[i].property === searchTerm) return i;
    }
    return -1;
}

function create_user_array(arr1,arr2){
    NSOA.meta.log('debug', 'Blend Arrays started');
    for(var i=0; i<arr1.length; i++){        
        for (var j=0;  j<arr2.length; j++){  
            if(arr1[i].jobcode === arr2[j].jobcode){
                arr1[i].newrate = arr2[j].rate;
                arr1[i].newcurrency = arr2[j].currency;
                //NSOA.meta.log('debug','Records Matched.');
                break;
            }else{//NSOA.meta.log('debug', 'arr1: '+ arr1[i].brid +' arr2: '+ arr2[j].id + ', '+ arr2[j].rev_cat); From old script, not relevant here
                continue;}
            continue;
        }
    }
    return arr1;
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