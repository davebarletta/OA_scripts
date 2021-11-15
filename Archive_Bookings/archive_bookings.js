function main() {
    var update_custom = [{name:"update_custom",value:"1"}];
    var today = new Date();
    var daycheck = today.getDay(); //The variable we want to check in our further case statement. This will return a value 0-6 corresponding with the day on the week for today.
	var daysminus = 0; // Days you want to subtract, to beset by case statement
    switch(daycheck){
        case 0 : daysminus = -1; //Today is Sunday
            break;
        case 1 : daysminus = 0; //Today is Monday
            break;
        case 2 : daysminus = 1; //Today is Tuesday
            break;
        case 3 : daysminus = 2; //Today is Wednesday
            break;
        case 4 : daysminus = 3; //Today is Thursday
            break;
        case 5 : daysminus = 4; //Today is Friday
            break;
        case 6 : daysminus = 5; //Today is Saturday
            break;
        default : NSOA.meta.log('error', 'Unable to calculate date offset.'); //This should never occur, but if it does there is a problem figuring which day is today.
            
    }
    
    var startday = new Date(today.getTime() - (daysminus * 24 * 60 * 60 * 1000)); //Need to calculate the start date using the variable assigned in above case statement
    var monday = startday.getFullYear() + '-'+ (startday.getMonth()+1)+'-'+ startday.getDate(); //start date is converted to a string
    var approvedtimesheets = new NSOA.record.oaTimesheet();
    approvedtimesheets.status = 'A';
    var unreadtimesheet = new NSOA.record.oaTimesheet();
    unreadtimesheet.pastBookingsArchived__c = '1';
    // Define the read request
    var tsreadRequest = {
        type: 'Timesheet',
        method: 'equal to, not equal to', // return only records that match search criteria
        fields: 'id, userid, starts, ends, pastBookingsArchived__c', // specify fields to be returned
        attributes: [ // Limit attribute is required; type is Attribute
            {
                name: 'limit',
                value: '1000'
            }
        ],
        objects: [ // One object with search criteria; type implied by rr type
            approvedtimesheets, unreadtimesheet
        ]
    };
    // Invoke the read call
    var tsresults = NSOA.wsapi.read(tsreadRequest);
    NSOA.meta.log('debug', 'There are ' + tsresults[0].objects.length + ' timesheets to process...');
    for (var a = 0; a < tsresults[0].objects.length; a++) {
        var tsid = tsresults[0].objects[a].id;
        var startsplit = tsresults[0].objects[a].starts.split(' ');
        var tsstart = new Date(startsplit[0]);
        NSOA.meta.log('debug', 'Day: ' + tsstart.getDate() + ' Month: ' + (tsstart.getMonth() + 1) + ' Year: ' + tsstart.getFullYear());
        var endsplit = tsresults[0].objects[a].ends.split(' ');
        var tsend = new Date(endsplit[0]);
        var tsuser = tsresults[0].objects[a].userid;
        var datenewer = new NSOA.record.oaDate();
        datenewer.day = tsstart.getDate();
        datenewer.month = (tsstart.getMonth() + 1);
        datenewer.year = tsstart.getFullYear();
        var dateolder = new NSOA.record.oaDate();
        dateolder.day = tsend.getDate();
        dateolder.month = (tsend.getMonth() + 1);
        dateolder.year = tsend.getFullYear();
        var startforbooking = tsstart.getFullYear() +"-"+(tsstart.getMonth() + 1)+"-"+tsstart.getDate();
        var endforbooking = tsend.getFullYear() +"-"+(tsend.getMonth() + 1)+"-"+tsend.getDate();
        NSOA.meta.log('debug', 'Start: ' + tsstart + ' End: ' + tsend + ' Date Newer: ' + datenewer + ' Date Older: ' + dateolder);
        var bookbydaysearch = new NSOA.record.oaBookingByDay();
        bookbydaysearch.userid = tsuser;
        var bbdnotarchived = new NSOA.record.oaBookingByDay();
        bbdnotarchived.booking_type_id = 10;
        // Define the read request
        var bookingreadRequest = {
            type: 'BookingByDay',
            method: 'equal to, not equal to',
            fields: 'id, date, booking_id, hours',
            attributes: [{
                    name: "limit",
                    value: "0,1000"
                },
                {
                    name: "filter",
                    value: "newer-than,older-than"
                },
                {
                    name: "field",
                    value: "date,date"
                }
            ],
            objects: [
                bookbydaysearch, bbdnotarchived, datenewer, dateolder
            ]
        };
        try {
            var bbdresults = NSOA.wsapi.read(bookingreadRequest);
            NSOA.meta.log('debug', 'User: ' + tsuser + ' Results: ' + JSON.stringify(bbdresults));
            var uniquebookings = [];
            for (var b = 0; b < bbdresults[0].objects.length; b++) {
                if (uniquebookings.indexOf(bbdresults[0].objects[b].booking_id) == -1) {
                    uniquebookings.push(bbdresults[0].objects[b].booking_id);
                } else {
                    /*NSOA.meta.log('debug', 'Duplicate Booking Value');*/ }
            }
            NSOA.meta.log('debug', 'Processed all records for user: ' + tsuser + '. Unique bookings found: ' + JSON.stringify(uniquebookings));
            var arrayforhours = [];
            for (var j = 0; j < uniquebookings.length; j++) {
                for (var i = 0; i < bbdresults[0].objects.length; i++) {
                    if (bbdresults[0].objects[i].booking_id == uniquebookings[j]) {
                        if (arrayforhours) {
                            arrayforhours.push(bbdresults[0].objects[i].hours);
                        }
                    }
                }
                NSOA.meta.log('debug', 'The hours for this booking: ' + JSON.stringify(arrayforhours));
                var hoursbookedthisweek = arrayforhours.reduce(function(priorvalue, nextvalue){
                    return priorvalue + nextvalue;
                }, 0);
                var thisbooking = new NSOA.record.oaBooking();
                thisbooking.id = uniquebookings[j];
                // Define the read request
                var thisbookingreadRequest = {
                    type : 'Booking',
                    method : 'equal to', // return only records that match search criteria
                    fields : 'id, startdate, enddate, hours, projectid, customerid', // specify fields to be returned
                    attributes : [ // Limit attribute is required; type is Attribute
                        {
                            name : 'limit',
                            value : '1'
                        }
                    ],
                    objects : [ // One object with search criteria; type implied by rr type
                        thisbooking
                    ]
                };
                // Invoke the read call
                var thisbookingresults = NSOA.wsapi.read(thisbookingreadRequest);
                NSOA.meta.log('debug', 'Booking Details: ' + JSON.stringify(thisbookingresults));
                var thisbookingproject = thisbookingresults[0].objects[0].projectid;
                var thisbookingcustomer = thisbookingresults[0].objects[0].customerid;
                var thisendsplit = thisbookingresults[0].objects[0].enddate.split(' ');
                var thisbookingend = new Date(thisendsplit[0]);
                var thisstartsplit = thisbookingresults[0].objects[0].startdate.split(' ');
                var thisbookingstart = new Date(thisstartsplit[0]);
                var checkend = thisbookingend<startday;
                NSOA.meta.log('debug', 'End date check: '+ checkend + ' This Booking End: '+ thisbookingend+ ' Monday: '+startday);
                if(checkend){
                    // Create the issue object
                    var taskdetail = new NSOA.record.oaTask();
                    taskdetail.timesheetid = tsid;
                    taskdetail.projectid = thisbookingproject;
                    // Define the read request
                    var taskreadRequest = {
                        type : 'Task',
                        method : 'equal to', // return only records that match search criteria
                        fields : 'id, date, hours, projectid, customerid', // specify fields to be returned
                        attributes : [ // Limit attribute is required; type is Attribute
                            {
                                name : 'limit',
                                value : '1000'
                            },
                            {
                                name: "filter",
                                value: "newer-than,older-than"
                            },
                            {
                                name: "field",
                                value: "date,date"
                            }
                        ],
                        objects : [
                            taskdetail, datenewer, dateolder
                        ]
                    };
                    // Invoke the read call
                    var taskresults = NSOA.wsapi.read(taskreadRequest);
                    NSOA.meta.log('debug', ' Time details: '+ JSON.stringify(taskresults));
                    var taskhours = [];
                    for (var e = 0; e < taskresults[0].objects.length; e++) {
                        taskhours.push(taskresults[0].objects[e].hours);
                    }
                    var hoursapproved = taskhours.reduce(function(oldvalue, newvalue){
                    return oldvalue + newvalue;
                	}, 0);
                    NSOA.meta.log('debug', ' Weekly hours: '+ hoursapproved);
                    var newbooking = new NSOA.record.oaBooking();
                    newbooking.projectid = thisbookingproject;
                    newbooking.customerid = thisbookingcustomer;
                    newbooking.hours = hoursapproved;
                    newbooking.booking_typeid = 7; //Confirmed Booking Type
                    newbooking.startdate = startforbooking;
                    newbooking.enddate= endforbooking;
                    newbooking.userid = tsuser;
                    // Invoke the add call
                    var newbookingresults = NSOA.wsapi.add([newbooking]);
                    NSOA.meta.log('debug', 'New Booking results: '+ JSON.stringify(newbookingresults));
                    var id = newbookingresults[0].id;
                    NSOA.meta.log('debug', 'New Confirmed Booking: '+ id);
                    
                    var thisbookingupd = new NSOA.record.oaBooking();
                    thisbookingupd.id = uniquebookings[j];
                    thisbookingupd.booking_typeid = 10;
                    
					// Invoke the modify call
                    var thisbookingupdresults = NSOA.wsapi.modify(update_custom, [thisbookingupd]);
                    
            
                    var thistimesheet = new NSOA.record.oaTimesheet();
                    thistimesheet.id = tsid;
                    thistimesheet.pastBookingsArchived__c = '1';
                    // Invoke the modify call
                    var thistimesheetresults = NSOA.wsapi.modify(update_custom, [thistimesheet]);
            }else{
                var checkstart = tsstart<thisbookingstart;
                if(checkstart){
                    NSOA.meta.log('debug', 'Check Start is true');
                }
            }
            
            }
            }
         catch (error) {
            NSOA.meta.log('error', error);
        }
    }

}

function arrayIsEmpty(array) {
    //If it's not an array, return FALSE.
    if (!Array.isArray(array)) {
        return FALSE;
    }
    //If it is an array, check its length property
    if (array.length >= 0) {
        //Return TRUE if the array is empty
        return true;
    }
    //Otherwise, return FALSE.
    return false;
}