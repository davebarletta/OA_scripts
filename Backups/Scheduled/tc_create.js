function main() {
    var startdate = determine_start_date();
    var enddate = determine_end_date();
    var existingusers = find_timesheets(startdate, enddate);
    var activeusers = search_users();
    create_timesheets(existingusers, activeusers, startdate, enddate);

}

function determine_start_date(){   
	var today = new Date();
    var daycheck = today.getDay(); //The variable we want to check in our further case statement. This will return a value 0-6 corresponding with the day on the week for today.
	var daysminus = 0; // Days you want to subtract, to be set by case statement
    switch(daycheck){
        case 0 : daysminus = 1; //Today is Sunday
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
    
    var startday = new Date(today.getTime() + (daysminus * 24 * 60 * 60 * 1000)); //Need to calculate the start date using the variable assigned in above case statement
    var monday = startday.getFullYear() + '-'+ (startday.getMonth()+1)+'-'+ startday.getDate(); //start date is converted to a string
    NSOA.meta.log('info', 'The search start date: ' + monday);
    return monday;
}

function determine_end_date(){
	var today = new Date();
    var daycheck = today.getDay(); //The variable we want to check in our further case statement. This will return a value 0-6 corresponding with the day on the week for today.
	var daysplus = 0; // Days you want to subtract, to be set by case statement
    switch(daycheck){
        case 0 : daysplus = 0; //Today is Sunday
            break;
        case 1 : daysplus = 6; //Today is Monday
            break;
        case 2 : daysplus = 5; //Today is Tuesday
            break;
        case 3 : daysplus = 4; //Today is Wednesday
            break;
        case 4 : daysplus = 3; //Today is Thursday
            break;
        case 5 : daysplus = 2; //Today is Friday
            break;
        case 6 : daysplus = 1; //Today is Saturday
            break;
        default : NSOA.meta.log('error', 'Unable to calculate date offset.'); //This should never occur, but if it does there is a problem figuring which day is today.
            
    }
    
    var endday = new Date(today.getTime() + (daysplus * 24 * 60 * 60 * 1000)); //Need to calculate the start date using the variable assigned in above case statement
    var sunday = endday.getFullYear() + '-'+ (endday.getMonth()+1)+'-'+ endday.getDate(); //start date is converted to a string
    NSOA.meta.log('info', 'The search end date: ' + sunday);
    return sunday;
}

function find_timesheets(startdate, enddate){
    //Existing Timesheet read criteria
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var existingtimesheets = new NSOA.record.oaTimesheet(); //Create the object to define the search criteria for our read
    existingtimesheets.starts = startdate; //Search Criteria for timesheet start date
    existingtimesheets.ends = enddate; //Search Criteria for timesheet end date
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Timesheet',
            fields: 'id, userid',
            method: 'equal to',
            objects: [existingtimesheets],
            attributes: [{name: "limit", value: increment + "," + pageSize}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    user: o.userid
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    var existingusers = []; //Creating a new array in order to run some logic and pass unique values from our above search.
        if(!isEmpty(resultsArray_JSON)){
                for (var i = 0; i < resultsArray_JSON.length; i++) {
                    if (existingusers.indexOf(resultsArray_JSON[i].user) !== -1) { 
                        NSOA.meta.log('debug', 'Duplicate user found'); 
                    } else {
                        existingusers.push(resultsArray_JSON[i].user);
                    }
                }
                NSOA.meta.log('debug', 'This Search has found ' + resultsArray_JSON.length + ' timesheets.'); 
                NSOA.meta.log('debug', 'The users needed to be excluded: ' + existingusers); 
        }
    return existingusers;

}

function search_users(){
	var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var usersmissingts = new NSOA.record.oaUser(); //Creating object to define search criteria
    usersmissingts.active = ''; //Inactive User
    usersmissingts.generic = 1; //Generic User
    while (limitReached === false) {

        readRequest[0] = {
            type: 'User',
            fields: 'id',
            method: 'not equal to',
            objects: [usersmissingts],
            attributes: [{name: "limit", value: increment + "," + pageSize}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
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
    NSOA.meta.log('debug', 'There are '+ resultsArray_JSON.length+ ' active users.');
    return resultsArray_JSON;
}

function create_timesheets(existingusers, activeusers, startdate, enddate){
    var date_utils = require('date_utils');
    for (var a = 0; a < activeusers.length; a++){
        var user = NSOA.record.oaUser(activeusers[a].id);
        var thisuser = activeusers[a].id;
        NSOA.meta.log('debug' , 'Index Of ' + existingusers.indexOf(thisuser));
        if(!isEmpty(existingusers) && existingusers.indexOf(thisuser) !== -1){ 
            NSOA.meta.log('info', 'Not creating a timesheet for ' + user.name);
        }
        else{
            
            NSOA.meta.log('debug', 'Creating timesheet for ' + user.name);
            // Create a timesheet for each user that has not yet opened one this week.
            var tstocreate = new NSOA.record.oaTimesheet();
            tstocreate.userid = activeusers[a].id; 
            tstocreate.starts = startdate;
            tstocreate.ends = enddate; 
            tstocreate.status = 'O'; 
            tstocreate.notes = 'Automatically generated timesheet for the week of ' + startdate + '-' + enddate;
            // Invoke the add call
            var addresults = NSOA.wsapi.add([tstocreate]); //Create the record outlined with the criteria above
            // Get the new Timesheet ID
            var newtsid = addresults[0].id;
            NSOA.meta.log('debug', 'New timesheet created for the user: ' + user.name + '. The timesheet id is '+ newtsid); 
            var firstday = date_utils.string_to_date(startdate);
            var endday = date_utils.string_to_date(enddate);
            var datenewer = new NSOA.record.oaDate();
            datenewer.day = firstday.getDate();
            datenewer.month = (firstday.getMonth()+1);
            datenewer.year = firstday.getFullYear();
            var dateolder = new NSOA.record.oaDate();
            dateolder.day = endday.getDate();
            dateolder.month = (endday.getMonth()+1);
            dateolder.year = endday.getFullYear();
        try{
            // Search Bookings by Day
            var bookbyday = new NSOA.record.oaBookingByDay();
            bookbyday.userid = activeusers[a].id;
            // Define the read request
            var bookingsread = {
                type : 'BookingByDay',
                method : 'equal to', 
                fields : 'id, date, hours, project_id, project_task_id', 
                attributes : [{name : 'limit', value : '1000'},{name : 'filter', value : 'newer-than, older-than'},{name : 'field', value : 'date, date'}],
                objects : [bookbyday, datenewer, dateolder]
            };
            // Invoke the read call
            var bookingresults = NSOA.wsapi.read(bookingsread);
            if (bookingresults[0].objects.length !== null){
                for (var b = 0; b < bookingresults[0].objects.length; b++){
                    NSOA.meta.log('debug', 'userid: ' + activeusers[a].id + ' timesheet id: ' + newtsid + ' date: ' + bookingresults[0].objects[b].date);
                    // Define a category object to create in OpenAir
                    var timeentry = new NSOA.record.oaTask();
                    timeentry.date = bookingresults[0].objects[b].date;
                    timeentry.userid = activeusers[a].id;
                    timeentry.decimal_hours = bookingresults[0].objects[b].hours;
                    timeentry.projectid = bookingresults[0].objects[b].project_id;
                    timeentry.projecttaskid = bookingresults[0].objects[b].project_task_id;
                    timeentry.notes = 'Time automatically added based on bookings for this week.';
                    // Invoke the add call
                    var timeentryresults = NSOA.wsapi.add([timeentry]);
                    // Get the new ID
                    var teid = timeentryresults[0].id;
                    NSOA.meta.log('debug', 'New Time Entry Created: ' + teid);
                }
                
            }else{NSOA.meta.log('info', 'No Bookings found for this user this week.');}
            }catch(e){
                NSOA.meta.log('info', 'No Bookings found for ' + user.name + ' this week.');
            }

        }
    }

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