function main() {
    var today = new Date(); //Variable created to capture today's date for future calculation
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate(); // Creating a date string... used for debugging to make sure today's date is correctly assigned
    var daycheck = today.getDay(); //The variable we want to check in our further case statement. This will return a value 0-6 corresponding with the day on the week for today.
	var daysminus = 0; // Days you want to subtract, to beset by case statement
    var daysplus = 0; // Days you want to add, to be set by case statement.
    switch(daycheck){
        case 0 : daysminus = -1; daysplus = 0; //Today is Sunday
            break;
        case 1 : daysminus = 0; daysplus = 6; //Today is Monday
            break;
        case 2 : daysminus = 1; daysplus = 5; //Today is Tuesday
            break;
        case 3 : daysminus = 2; daysplus = 4; //Today is Wednesday
            break;
        case 4 : daysminus = 3; daysplus = 3; //Today is Thursday
            break;
        case 5 : daysminus = 4; daysplus = 2; //Today is Friday
            break;
        case 6 : daysminus = 5; daysplus = 1; //Today is Saturday
            break;
        default : NSOA.meta.log('error', 'Unable to calculate date offset.'); //This should never occur, but if it does there is a problem figuring which day is today.
            
    }
    
    var startday = new Date(today.getTime() - (daysminus * 24 * 60 * 60 * 1000)); //Need to calculate the start date using the variable assigned in above case statement
    var monday = startday.getFullYear() + '-'+ (startday.getMonth()+1)+'-'+ startday.getDate(); //start date is converted to a string
   
    var endday = new Date(today.getTime() + (daysplus * 24 * 60 * 60 * 1000)); //Need to calculate the end date using the variable assignment from the case statement
    var sunday = endday.getFullYear() + '-'+ (endday.getMonth()+1)+'-'+ endday.getDate(); //converting the end date to a string
    NSOA.meta.log('info', 'Today is: ' + date + ' Monday: ' + monday + ' Sunday: ' + sunday + ' Daycheck: '+ daycheck); //Validate that the math is correct
    
    
    //Existing Timesheet read criteria
    var existingtimesheets = new NSOA.record.oaTimesheet(); //Create the object to define the search criteria for our read
    existingtimesheets.starts = monday; //Search Criteria for timesheet start date
    existingtimesheets.ends = sunday; //Search Criteria for timesheet end date
    // Define the read request
    var readexisting = {
        type: 'Timesheet', //SOAP Object to search
        method: 'equal to',  //Whether it is inclusive or exclusive search criteria
        fields: 'id, userid', //Fields to return in your array
        attributes: [ 
            {
                name: 'limit', //Limit is required
                value: '1000' //how many records to return, maximum allowance is 1000
            }
        ],
        objects: [ 
            existingtimesheets //add the search criteria variable from above in here
        ]
    };
    // Invoke the read call
    var existingresults = NSOA.wsapi.read(readexisting); //Passing the results of your search to a new Array vartiable
    var existingusers = []; //Creating a new array in order to run some logic and pass unique values from our above search.
    for (var i = 0; i < existingresults[0].objects.length; i++) { //Allows us to loop through each value returned in our search array
        if (existingusers.indexOf(existingresults[0].objects[i].userid) !== -1) { //indexOf returns the position withing an array for a value you search. In this case, searching for the current user being looped through in our for statement. If -1 is returned, the value was not found
            NSOA.meta.log('debug', 'Duplicate user found'); //Anything other than -1, simply printing a debugf log to notify a Duplicate user is found
        } else {
            existingusers.push(existingresults[0].objects[i].userid); //If -1 is returned, adding this user into a new array of users who need timesheets created.
        }
    }
    NSOA.meta.log('debug', 'This Search has found ' + existingresults[0].objects.length + ' timesheets.'); //Debug log to check the status of the currently running operation
    NSOA.meta.log('debug', 'The users needed to be excluded ' + existingusers); //Debug log to check the status of the currently running operation
    // Create the user read criteria
    var usersmissingts = new NSOA.record.oaUser(); //Creating object to define search criteria
    usersmissingts.active = ''; //Inactive User
    usersmissingts.generic = 1; //Generic User
    // Define the read request
    var readusers = {
        type: 'User', //SOAP Object type
        method: 'not equal to', //Looking for records not equal to my criteria, this should return all Active Users that are not Generic Users.
        fields: 'id', //The ID is the only value needed at this time.
        attributes: [ 
            {
                name: 'limit', //Limit is required
                value: '1000' //how many records to return, maximum allowance is 1000
            }
        ],
        objects: [ 
            usersmissingts //the search criteria to be used
        ]
    };
    // Invoke the read call
    var userresults = NSOA.wsapi.read(readusers); //create an array with the results from your search
    NSOA.meta.log('debug', 'There are '+ userresults[0].objects.length+ ' active users.'); //Used to validate that the search worked
    for (var a = 0; a < userresults[0].objects.length; a++){ //this helps to loop through each record within the Array of results
        if(existingusers.indexOf(userresults[0].objects[a].id) !== -1){ //Checking if the user should be excluded, meaning they were in our first search and have already created a timesheet this week.
            NSOA.meta.log('info', 'Not creating a timesheet for this user.');
        }
        else{
            // Create a timesheet for each user that has not yet opened one this week.
            var tstocreate = new NSOA.record.oaTimesheet(); //The record to create
            tstocreate.userid = userresults[0].objects[a].id; //assigning the user id to the current user in our loop
            tstocreate.starts = monday; //assigning the timesheet start date to be this Monday
            tstocreate.ends = sunday; //assigning the timesheet start date to be this Sunday
            tstocreate.status = 'O'; //assigning the timesheet status to be Open
            tstocreate.notes = 'Automatically generated timesheet for the week of ' + monday + '-' + sunday; //adding notes to show this was automatically generated by the system
            // Invoke the add call
            var addresults = NSOA.wsapi.add([tstocreate]); //Create the record outlined with the criteria above
            // Get the new Timesheet ID
            var newtsid = addresults[0].id;
            NSOA.meta.log('debug', 'New timesheet created for the user id: ' + userresults[0].objects[a].id+ '. The timesheet id is '+ newtsid); //For information while testing
            
            var dayprior = -1;
            var firstday = new Date(today.getTime() - (dayprior * 24 * 60 * 60 * 1000));
            var datenewer = new NSOA.record.oaDate();
            datenewer.day = firstday.getDate();
            datenewer.month = (firstday.getMonth()+1);
            datenewer.year = firstday.getFullYear();
            var dateolder = new NSOA.record.oaDate();
            dateolder.day = endday.getDate();
            dateolder.month = (endday.getMonth()+1);
            dateolder.year = endday.getFullYear();
            
            
            // Search Bookings by Day
            var bookbyday = new NSOA.record.oaBookingByDay();
            bookbyday.userid = userresults[0].objects[a].id;
            // Define the read request
            var bookingsread = {
                type : 'BookingByDay',
                method : 'equal to', 
                fields : 'id, date, hours, project_id, project_task_id', 
                attributes : [ 
                    {
                        name : 'limit',
                        value : '1000'
                    },
                    {
                        name : 'filter',
                        value : 'newer-than, older-than'
                    },
                    {
                        name : 'field',
                        value : 'date, date'
                    }
                ],
                objects : [ 
                    bookbyday, datenewer, dateolder
                ]
            };
            // Invoke the read call
            var bookingresults = NSOA.wsapi.read(bookingsread);
            if (bookingresults[0].objects.length !== null){
                for (var b = 0; b < bookingresults[0].objects.length; b++){
                    NSOA.meta.log('debug', 'userid: ' + userresults[0].objects[a].id + ' timesheet id: ' + newtsid + ' date: ' + bookingresults[0].objects[b].date);
                    // Define a category object to create in OpenAir
                    var timeentry = new NSOA.record.oaTask();
                    timeentry.date = bookingresults[0].objects[b].date;
                    timeentry.userid = userresults[0].objects[a].id;
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

        }
    }


}