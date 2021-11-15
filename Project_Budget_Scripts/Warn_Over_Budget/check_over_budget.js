function main(type) {
    // Grab form fields
    var totalhours = NSOA.form.getValue('hours');
    var taskid = NSOA.form.getValue('project_task_id');
    var userid = NSOA.form.getValue('user_id');
    var bookingend = NSOA.form.getValue('enddate');
    //Log Output for testing
    NSOA.meta.log('debug','Total Hours: '+totalhours+' Task ID: '+taskid+' User ID: '+userid);
    
    // Create the Task object for search
    var ptask = new NSOA.record.oaProjecttask();
    ptask.id = taskid;
    //Task read request
    var taskRead = {
        type : 'Projecttask',
        method : 'equal to', 
        fields : 'id, planned_hours, fnlt_date', // specify fields to be returned
        attributes : [ 
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [ 
            ptask
        ]
    };
    //Task read call
    var taskResults = NSOA.wsapi.read(taskRead);
    var taskplannedhours = taskResults[0].objects[0].planned_hours;
    var taskenddate = taskResults[0].objects[0].fnlt_date;
    // Log Output for testing
    NSOA.meta.log('debug', 'Task Planned hours: '+ taskplannedhours);
    
    var bookfilters = new NSOA.record.oaBooking();
    bookfilters.project_taskid = taskid;
    
    // Booking read request
    var bookingRead = {
        type : 'Booking',
        method : 'equal to', 
        fields : 'id, hours, ', // specify fields to be returned
        attributes : [ 
            {
                name : 'limit',
                value : '1000'
            }
        ],
        objects : [bookfilters]
    };
    //Booking read call
    var bookingResults = NSOA.wsapi.read(bookingRead);
    var totalbookedhours = 0;
    NSOA.meta.log('debug', JSON.stringify(bookingResults)); 
    for(var i = 0; i < bookingResults[0].objects.length; ++i )		{
        var bookingadd = parseFloat(bookingResults[0].objects[i].hours);
        //Log Output for testing
        NSOA.meta.log('debug', 'The hours for this booking: '+ bookingadd);
    	totalbookedhours += bookingadd;
        
    	}
    //Log Output for Testing
    NSOA.meta.log('debug', 'Total Booked hours on this task: '+ totalbookedhours);
    if(totalhours + totalbookedhours > taskplannedhours)
        {
            NSOA.form.confirmation('This booking has put you over your total task planned hours.');
        }
    var checkbooking = convertToDate(bookingend);
    var checktask = convertToDate(taskenddate);
    
    if (checkbooking > checktask){
		NSOA.form.confirmation('This booking has put you over your scheduled task end date.');
    }else{return;}       
}

// Helper function for converting date strings to JS Date objects
function convertToDate(vDate) {
    // Expected date format is a string: YYYY-MM-DD 0:0:0
    var aYMD = vDate.split(' ');
    aYMD = aYMD[0].split('-');
    return new Date(aYMD[0], aYMD[1] - 1, aYMD[2]);
}