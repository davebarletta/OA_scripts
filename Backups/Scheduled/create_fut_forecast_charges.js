function main() {
    var activeprj = get_active_projects();
    
    
    for(var i = 0; i< activeprj.length; i++){
        create_rev_charges(activeprj[i].id,activeprj[i].start,activeprj[i].rev);
    	var chargestoupdate = find_charges_to_keep(activeprj[i].id);   		
        var calcdmonths = add_cost_to_nxt_month(chargestoupdate);
        if(calcdmonths.length > 0){
        	NSOA.meta.log('debug', 'Charges to Update(after calc): ' + JSON.stringify(calcdmonths));
            perform_slip_upsert(calcdmonths);
        }
    }
    var chargestoremove = find_charges_to_delete();
    NSOA.meta.log('debug', 'Old Charges to Remove: ' + JSON.stringify(chargestoremove));
    delete_charges(chargestoremove);
}

function find_charges_to_keep(prj){
    var date_utils = require('date_utils');
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutespriorvalue = new Date(today.getFullYear(), today.getMonth(), 1);
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = minutespriorvalue.getDate();
    datenewer.month = (minutespriorvalue.getMonth()+1);
    datenewer.year = minutespriorvalue.getFullYear();
    datenewer.hour= minutespriorvalue.getHours();
    datenewer.second = minutespriorvalue.getSeconds();
    datenewer.minute = minutespriorvalue.getMinutes();
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var dccriteria = new NSOA.record.oaSlip();
    dccriteria.slip_stageid = 7;
    dccriteria.projectid  = prj;
    var tccriteria = new NSOA.record.oaSlip();
    tccriteria.slip_stageid = 6;
    tccriteria.projectid  = prj;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip",
            fields: "id, date, cost, projectid, customChargeExternal__c, total, slip_stageid",
            method: "equal to, or equal to",
            objects: [dccriteria, tccriteria, datenewer],
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
                value : 'date'
           }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
		//NSOA.meta.log('debug', 'PBG Read' + JSON.stringify(resultsArray));
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                var date = date_utils.string_to_date(o.date);
                if(date >= minutespriorvalue){
                    var ext = o.customChargeExternal__c.substr(1);
                    var check = arrayObjectIndexOf(resultsArray_JSON, ext, "extid");
                    if(check === -1 ){
                        resultsJSON = {
                            id: o.id,
                            project: o.projectid,
                            date: o.date,
                            cost: o.cost,
                            extid: ext,
                            total: o.total,
                            stage: o.slip_stageid 
                        };
                        resultsArray_JSON.push(resultsJSON);
                    }else{
                        NSOA.meta.log('debug', 'Adding a Total');
                        resultsArray_JSON[check].total = Number(resultsArray_JSON[check].total) + Number(o.total);
                    }
            }else{
                //NSOA.meta.log('debug', 'Old, no need to handle');
            }
                });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
        
    }
       resultsArray_JSON.sort(function (a,b){
       		return b.extid - a.extid;
   });
   
    return resultsArray_JSON;
}

function find_charges_to_delete(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutespriorvalue = new Date(today.getFullYear(), today.getMonth(), 1);
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = minutespriorvalue.getDate();
    datenewer.month = (minutespriorvalue.getMonth()+1);
    datenewer.year = minutespriorvalue.getFullYear();
    datenewer.hour= minutespriorvalue.getHours();
    datenewer.second = minutespriorvalue.getSeconds();
    datenewer.minute = minutespriorvalue.getMinutes();
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var oldccriteria = new NSOA.record.oaSlip();
    oldccriteria.slip_stageid = 12;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip",
            fields: "id, date, cost, projectid, customChargeExternal__c, total",
            method: "equal to",
            objects: [oldccriteria, datenewer],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize
            },            
            {
                name : 'filter',
                value : 'older-than'
            },
            {
                name : 'field',
                value : 'date'
           }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
		//NSOA.meta.log('debug', 'PBG Read' + JSON.stringify(resultsArray));
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
                    date: o.date,
                    cost: o.cost,
                    extid: o.customChargeExternal__c,
                    total: o.total
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function get_active_projects(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var project = new NSOA.record.oaProject();
    project.active = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Project',
            fields: 'id, start_date, prjamount__c',
            method: 'equal to',
            objects: [project],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' Active Projects to process...');

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    start: o.start_date,
                    rev: o.prjamount__c 
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
   
    return resultsArray_JSON;
}

function perform_slip_upsert(array){
    var upsertarray = [];
    for(var i=0;i<array.length;i++){ 
        var obj = new NSOA.record.oaSlip();
        obj.name = array[i].extid;
        obj.date = array[i].date;
        obj.projectid = array[i].project;
        obj.total = array[i].total;
        obj.cost = array[i].total;
        obj.type = 'F';
        obj.futCostExt__c = array[i].extid;
        obj.slip_stageid = 12;
        upsertarray.push(obj);
        
    }
    var attribute = [{
            name : 'lookup',
            value : 'futCostExt__c'
        },{name: "update_custom", value: "1"}];

        // Invoke the upsert call
        var upsresults = NSOA.wsapi.upsert(attribute, upsertarray);
        NSOA.meta.log('debug',JSON.stringify(upsresults));
    return;
}

function add_cost_to_nxt_month(array){
    if(!isEmpty(array)){
        for(var i = 1; i< array.length; i++){
        	var priorindex = i-1;
            array[i].total = Number(array[i].total) + Number(array[priorindex].total);
    	}
        return array;
    }else{
        NSOA.meta.log('debug', 'No future planned cost for this project');
        return false;
    }
    
}

function delete_charges(array){
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var newslip = new NSOA.record.oaSlip();
    		newslip.id = searcharrays[i][j].id;
            objarray.push(newslip);

        }
		var results = NSOA.wsapi.delete(objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           
        }
        NSOA.meta.log('debug', i+1 + 'array has been processed...');

    }
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
}   

function create_rev_charges(project,date,rev){
    var upsertarray = [];
    var date_utils = require('date_utils');
    for(var i = 0; i< 13; i++){
        var stringdate = date_utils.string_to_date(date);
        var newdate = new Date(stringdate.setMonth(stringdate.getMonth()+i));
        var string = date_utils.date_to_string(newdate);
        var obj = new NSOA.record.oaSlip();
        obj.name = 'For Rev';
        obj.date = string;
        obj.projectid = project;
        obj.total = rev;
        obj.cost = rev;
        obj.type = 'F';
        obj.revExt__c = project+string;
        obj.slip_stageid = 13;
        upsertarray.push(obj);
    }
        var attribute = [{
            name : 'lookup',
            value : 'revExt__c'
        },{name: "update_custom", value: "1"}];

        // Invoke the upsert call
        var upsresults = NSOA.wsapi.upsert(attribute, upsertarray);
        //NSOA.meta.log('debug',JSON.stringify(upsresults));
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