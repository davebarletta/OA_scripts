function main(){
    archive_booking();
    move_ts_actuals();   
}

function archive_booking(){
    NSOA.wsapi.disableFilterSet(true);
    var startdate = determine_start_date();
    var enddate = determine_end_date();
    var bookingstocheck = return_unique_bookings(startdate,enddate);
    var uniquebookings = check_unique_bookings(bookingstocheck);
    var bookingstoshorten = end_date_validation(uniquebookings,enddate);
    var hourstotal = calc_hours_to_remove(bookingstocheck, bookingstoshorten);
    shorten_bookings(hourstotal, startdate, enddate);
    NSOA.wsapi.disableFilterSet(false);
}

function move_ts_actuals(){
    NSOA.wsapi.disableFilterSet(true);
    var aprvdtimesheets = timesheets_to_process();
    var processtime = process_timesheets(aprvdtimesheets);
    if(processtime !== null){
    	var bookings = create_booking_update(aprvdtimesheets, processtime);
    }else{return;}
    NSOA.wsapi.disableFilterSet(false);
}

function determine_end_date(){
	var today = new Date();
    var daycheck = today.getDay(); //The variable we want to check in our further case statement. This will return a value 0-6 corresponding with the day on the week for today.
	var daysminus = 0; // Days you want to subtract, to be set by case statement
    switch(daycheck){
        case 0 : daysminus = -6; //Today is Sunday
            break;
        case 1 : daysminus = 0; //Today is Monday
            break;
        case 2 : daysminus = -1; //Today is Tuesday
            break;
        case 3 : daysminus = -2; //Today is Wednesday
            break;
        case 4 : daysminus = -3; //Today is Thursday
            break;
        case 5 : daysminus = -4; //Today is Friday
            break;
        case 6 : daysminus = -5; //Today is Saturday
            break;
        default : NSOA.meta.log('error', 'Unable to calculate date offset.'); //This should never occur, but if it does there is a problem figuring which day is today.
            
    }
    
    var endday = new Date(today.getTime() + (daysminus * 24 * 60 * 60 * 1000)); //Need to calculate the start date using the variable assigned in above case statement
    var monday = endday.getFullYear() + '-'+ (endday.getMonth()+1)+'-'+ endday.getDate(); //start date is converted to a string
    NSOA.meta.log('info', 'The search end date: ' + monday);
    return endday;
}

//Going to look back 4 weeks from Monday within the current week to ensure all bookings have been processed correctly.
function determine_start_date(){   
	var today = new Date();
    var daycheck = today.getDay(); //The variable we want to check in our further case statement. This will return a value 0-6 corresponding with the day on the week for today.
	var daysminus = 0; // Days you want to subtract, to be set by case statement
    switch(daycheck){
        case 0 : daysminus = -27; //Today is Sunday
            break;
        case 1 : daysminus = -28; //Today is Monday
            break;
        case 2 : daysminus = -29; //Today is Tuesday
            break;
        case 3 : daysminus = -30; //Today is Wednesday
            break;
        case 4 : daysminus = -31; //Today is Thursday
            break;
        case 5 : daysminus = -32; //Today is Friday
            break;
        case 6 : daysminus = -33; //Today is Saturday
            break;
        default : NSOA.meta.log('error', 'Unable to calculate date offset.'); //This should never occur, but if it does there is a problem figuring which day is today.
            
    }
    
    var startday = new Date(today.getTime() + (daysminus * 24 * 60 * 60 * 1000)); //Need to calculate the start date using the variable assigned in above case statement
    var monday = startday.getFullYear() + '-'+ (startday.getMonth()+1)+'-'+ startday.getDate(); //start date is converted to a string
    NSOA.meta.log('info', 'The search start date: ' + monday);
    return startday;
}

function return_unique_bookings(newer, older){
    NSOA.wsapi.disableFilterSet(true);
    var archived = NSOA.context.getParameter('archivedbt');
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = newer.getDate();
    datenewer.month = (newer.getMonth() + 1);
    datenewer.year = newer.getFullYear();
    var dateolder = new NSOA.record.oaDate();
    dateolder.day = older.getDate();
    dateolder.month = (older.getMonth() + 1);
    dateolder.year = older.getFullYear();
    
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var bbdnotarchived = new NSOA.record.oaBookingByDay();
    bbdnotarchived.booking_type_id = archived;
    while (limitReached === false) {

        readRequest[0] = {
            type: 'BookingByDay',
            fields: 'id, date, booking_id, hours',
            method: 'not equal to',
            objects: [bbdnotarchived, datenewer, dateolder],
            attributes: [{name: "limit", value: increment + "," + pageSize},
            {name: "filter", value: "newer-than,older-than"},
            {name: "field", value: "date,date"}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			//Might not need this at all, but was going to calculate hours here... if script is inefficient in the future, can very likely do hours calculation at this stage
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    date: o.date,
                    booking_id: o.booking_id,
                    hours: Number(o.hours)
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
        
    
	NSOA.wsapi.disableFilterSet(false);
    NSOA.meta.log('debug','Full BBD Array: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function check_unique_bookings(array){
    var uniquebookings = [];
    for (var b = 0; b < array.length; b++) {
            if (uniquebookings.indexOf(array[b].booking_id) == -1) {
                uniquebookings.push(array[b].booking_id);
            } else {
                /*NSOA.meta.log('debug', 'Duplicate Booking Value');*/ }
        }
        NSOA.meta.log('debug','Unique bookings found: ' + JSON.stringify(uniquebookings));
    return uniquebookings;
}

function end_date_validation(array, enddate){
    var date_utils = require('date_utils');
    var attributes = [{name:"update_custom",value:"1"}];
    var updatestomake = [];
    var bookingstoshorten = [];
    var datecheck = new Date(enddate);
    var archived = NSOA.context.getParameter('archivedbt');
    for(var i = 0; i <array.length; i++){
        var booking = new NSOA.record.oaBooking();
        booking.id = array[i];
        var readRequest = {
            type : 'Booking',
            method : 'equal to', 
            fields : 'id, addedByArchive__c, startdate, enddate, hours, customerid, projectid, project_taskid, userid, booking_typeid',
            attributes : [{name : 'limit', value : '1'}],
            objects : [booking]
        };
        // Invoke the read call
        var results = NSOA.wsapi.read(readRequest);
        if(!isEmpty(results)){
            var stringdate = date_utils.string_to_date(results[0].objects[0].enddate);
            var bookingenddate = new Date(stringdate);
            if(results[0].objects[0].addedByArchive__c == '1' || results[0].objects[0].addedByArchive__c === true){
                NSOA.meta.log('debug', 'This booking was already processed.');
                continue;
            }
            else if(bookingenddate <= datecheck){
                updatestomake.push(array[i]);
                NSOA.meta.log('debug', 'End Date less than this monday... booking to be archived');
            }else{
                var bookjson = {
                    id: array[i],
                    hours: 0,
                    customer: results[0].objects[0].customerid,
                    currentstart: results[0].objects[0].startdate,
                    currentend: results[0].objects[0].enddate,
                    totalhrs: results[0].objects[0].hours,
                    project: results[0].objects[0].projectid,
                    task: results[0].objects[0].project_taskid,
                    user: results[0].objects[0].userid,
                    bookingtype: results[0].objects[0].booking_typeid
                };
                bookingstoshorten.push(bookjson);
                NSOA.meta.log('debug', 'End Date expands to future, booking needs to be shortened' + ' Booking End Date: ' + bookingenddate + ' End Check: ' + datecheck);
            }
        }else{
            continue;
        }
    }
    /*var searcharrays = splitArrayIntoChunksOfLen(updatestomake, 1000);
    NSOA.meta.log('debug', 'Search Arrays:  ' + JSON.stringify(searcharrays));
    for (var j=0;j<searcharrays.length;j++){
        var objarray = [];
        for (var k=0;j<searcharrays[j].length;k++){
            var updatebooking = new NSOA.record.oaBooking();
    		updatebooking.id = searcharrays[j][k];
            updatebooking.booking_typeid = archived;
            updatebooking.addedByArchive__c = '1';
            objarray.push(updatebooking);

        }
        NSOA.meta.log('debug', 'Booking Objarray after for: '+ JSON.stringify(objarray));
        
		var updresults = NSOA.wsapi.modify(attributes, objarray);
         if (!updresults || !updresults[0] || !updresults[0].objects) {
            // An unexpected error has occurred!
             NSOA.meta.log('debug', 'An Unexpected error has occured');
        } else if (updresults[0].errors !== null && updresults[0].errors.length > 0) {
            // There are errors to handle!
            NSOA.meta.log('debug', 'There are errors to handle!');
        } else {
           NSOA.meta.log('debug', j+1 + 'array has been processed...');
        }

    }*/
    for(var a = 0; a<updatestomake.length;a++){
        var updatebooking = new NSOA.record.oaBooking();
    	updatebooking.id = updatestomake[a];
        updatebooking.booking_typeid = archived;
        updatebooking.addedByArchive__c = '1';
        var updresults = NSOA.wsapi.modify(attributes, [updatebooking]);
        NSOA.meta.log('debug', 'Update Result: ' + JSON.stringify(updresults));
    }
    return bookingstoshorten;
}

function calc_hours_to_remove(fullarray, arraytoshorten){
    for (var a = 0; a < fullarray.length; a++) {
        for (var b = 0; b<arraytoshorten.length; b++){
            if(fullarray[a].booking_id == arraytoshorten[b].id){
                arraytoshorten[b].hours = arraytoshorten[b].hours + fullarray[a].hours;
            }else{
                
            }
        }
        }
    NSOA.meta.log('info', 'Array to shorten with total hours: ' + JSON.stringify(arraytoshorten));
    return arraytoshorten;  
}

function shorten_bookings(array, startdate, enddate){
    var archived = NSOA.context.getParameter('archivedbt');
    var attributes = [{name:"update_custom",value:"1"}];
    var end2 = enddate;
    var date_utils = require('date_utils');
    enddate.setDate(enddate.getDate() - 3);
    var starts = date_utils.date_to_string(startdate);
    var ends = date_utils.date_to_string(enddate);
    var newstart = date_utils.date_to_string(end2);
    var upsertarray = [];
    var updatearray =[];
    for (var i = 0; i< array.length; i++){
        var bookingupdate = new NSOA.record.oaBooking();
        bookingupdate.id = array[i].id;
        bookingupdate.hours = (Number(array[i].totalhrs) - Number(array[i].hours));
        bookingupdate.startdate = newstart;
        bookingupdate.enddate = array[i].currentend;
        bookingupdate.customerid = array[i].customer;
        bookingupdate.projectid = array[i].project;
        bookingupdate.userid = array[i].user;
        bookingupdate.project_taskid = array[i].task;
        bookingupdate.booking_typeid = array[i].bookingtype;
        updatearray.push(bookingupdate);
        NSOA.meta.log('debug', 'About to update booking...');
        //var updresults = NSOA.wsapi.modify(attributes, [bookingupdate]);
        //NSOA.meta.log('debug', 'Update Status: ' + JSON.stringify(updresults));
        var bookingcreate = new NSOA.record.oaBooking();
        bookingcreate.booking_typeid = archived;
        bookingcreate.addedByArchive__c = '1';
        bookingcreate.startdate = array[i].currentstart;
        bookingcreate.enddate = ends;
        bookingcreate.hours = array[i].hours;
        bookingcreate.customerid = array[i].customer;
        bookingcreate.projectid = array[i].project;
        bookingcreate.project_taskid = array[i].task;
        bookingcreate.userid = array[i].user;
        upsertarray.push(bookingcreate);
        //var creresults = NSOA.wsapi.add([bookingcreate]);
       //NSOA.meta.log('debug', 'Create Status: ' + JSON.stringify(creresults));

    }
    var updresults = NSOA.wsapi.modify(attributes, updatearray);
    var upsresults = NSOA.wsapi.upsert(attributes, upsertarray);
    NSOA.meta.log('debug', 'Upsert Status: ' + JSON.stringify(upsresults));
}

function timesheets_to_process(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var approvedtimesheets = new NSOA.record.oaTimesheet();
    approvedtimesheets.status = 'A';
    var unreadtimesheet = new NSOA.record.oaTimesheet();
    unreadtimesheet.pastBookingsArchived__c = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Timesheet',
            fields: 'id, userid, starts, ends, pastBookingsArchived__c',
            method: 'equal to, not equal to',
            objects: [approvedtimesheets, unreadtimesheet],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
       

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            NSOA.meta.log('info', 'There is no time to be Archived.');
            return null;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			NSOA.meta.log('info', 'There are ' + resultsArray[0].objects.length + ' timesheets to process...');
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    userid: o.userid,
                    starts: o.starts,
                    ends: o.ends,
                    archived: o.pastBookingsArchived__c
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function process_timesheets(array){
    var bookingstocreate = [];
    for(var i = 0; i< array.length; i++){
        var readRequest = [], resultsJSON, resultsArray_JSON = [];
        var increment = 0, pageSize = 1000, limitReached = false;
        var approvedtimesheets = new NSOA.record.oaTask();
        approvedtimesheets.timesheetid = array[i].id;

            readRequest[0] = {
                type: 'Task',
                fields: 'id, userid, projectid, customerid, decimal_hours, projecttaskid, timesheetid, date',
                method: 'equal to',
                objects: [approvedtimesheets],
                attributes: [{
                    name: 'limit',
                    value: increment + ',' + pageSize
                }]
            };


            var resultsArray = NSOA.wsapi.read(readRequest);
            
			
            if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
                // An unexpected error has occurred!
            } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
                // There are errors to handle!
            } else {
                // Process the response as expected
				NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' time entries to process...');
                resultsArray[0].objects.forEach(function (o) {
                    var checkexists = checkMerge(bookingstocreate, String(o.timesheetid+o.projectid+o.userid+o.projecttaskid));
                    NSOA.meta.log('debug', 'Check Exists Value: ' + checkexists);
                    if(checkexists === -1){
                    resultsJSON = {
                        id: o.id,
                        date: o.date,
                        timesheetid: o.timesheetid,
                        userid: o.userid,
                        project: o.projectid,
                        customer: o.customerid,
                        task: o.projecttaskid,
                        hours: o.decimal_hours,
                        mergekey: o.timesheetid+o.projectid+o.userid+o.projecttaskid
                    };
                    resultsArray_JSON.push(resultsJSON);
                    bookingstocreate.push(resultsJSON);
                	}else{
                        bookingstocreate[checkexists].hours = Number(bookingstocreate[checkexists].hours) + Number(o.decimal_hours);
                    }
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        
        }
    
    
    NSOA.meta.log('debug', 'Task Array: ' + JSON.stringify(bookingstocreate));
    return bookingstocreate;       
}

function create_booking_update(tsarray,taskarray){
    var attributes = [{name:"update_custom",value:"1"}];
    var updates = [];
    var timesheets = [];
    for(var i = 0; i < taskarray.length; i++){
        for (var j = 0; j < tsarray.length; j ++){
            if(taskarray[i].timesheetid == tsarray[j].id){
                var newbooking = new NSOA.record.oaBooking();
                newbooking.projectid = taskarray[i].project;
                newbooking.customerid = taskarray[i].customer;
                newbooking.hours = taskarray[i].hours;
                newbooking.booking_typeid = 12; //Confirmed Booking Type
                newbooking.startdate = tsarray[j].starts;
                newbooking.enddate= tsarray[j].ends;
                newbooking.userid = taskarray[i].userid;
                newbooking.addedByArchive__c = '1';
                newbooking.project_taskid = taskarray[i].task;
                updates.push(newbooking);
                var updts = new NSOA.record.oaTimesheet();
                updts.id = tsarray[j].id;
                updts.pastBookingsArchived__c = '1';
                timesheets.push(updts);
            }
        }
    }
    var newbookingresults = NSOA.wsapi.add(updates);
    NSOA.meta.log('info', 'New Booking results: '+ JSON.stringify(newbookingresults));
    var tsmodifyresults = NSOA.wsapi.modify(attributes, timesheets);
    NSOA.meta.log('info', 'Update timesheet results: '+ JSON.stringify(tsmodifyresults));

}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
}

function checkMerge(myArray, searchTerm) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i].mergekey === searchTerm) return i;
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