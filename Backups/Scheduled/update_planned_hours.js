function main() {
    var today = new Date(); //Variable created to capture today's date for future calculation
    var hoursprior = 12;
    var hourspriorvalue = new Date(today.getTime() - (hoursprior *60*60*1000));
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = hourspriorvalue.getDate();
    datenewer.month = (hourspriorvalue.getMonth()+1);
    datenewer.year = hourspriorvalue.getFullYear();
    datenewer.hour= hourspriorvalue.getHours();
    datenewer.second = hourspriorvalue.getSeconds();
    datenewer.minute = hourspriorvalue.getMinutes();
    var scriptuser = NSOA.context.getParameter('bookingscriptuser');
    // Find newly updated Bookings
    var producerbookings = new NSOA.record.oaBooking();
    //producerbookings.ownerid = scriptuser;
    // Define the read request
    var recentbookingrequest = {
        type : 'Booking',
        method : 'not equal to', // return only records that match search criteria
        fields : 'id, updated, created, ownerid, userid, customerid, projectid, project_taskid', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1000'
            },
            {
                name : 'filter',
                value : 'newer-than'
            },
            {
              name : 'field',
              value : 'updated'
            }
        ],
        objects : [ // One object with search criteria; type implied by rr type
            producerbookings, datenewer
        ]
    };
    // Invoke the read call
    var recentbookingresults = NSOA.wsapi.read(recentbookingrequest);
    var taskstoupdate = [];
    if(!arrayIsEmpty(recentbookingresults)){
    	NSOA.meta.log('info', 'No updated bookings found');
        return;
    }else{
        for (var a=0; a<recentbookingresults[0].objects.length; a++){
        if(taskstoupdate.indexOf(recentbookingresults[0].objects[a].project_taskid) == -1){
        taskstoupdate.push(recentbookingresults[0].objects[a].project_taskid);
        }else{NSOA.meta.log('debug', 'Duplicate Task Value');}
        }
            for(var b=0; b<taskstoupdate.length;b++){
                var taskbookings = new NSOA.record.oaBooking(); 
                taskbookings.project_taskid = taskstoupdate[b];
                var exclarchivebookings = new NSOA.record.oaBooking();
                exclarchivebookings.booking_typeid = 10;
                var thistaskbookings = {
                type : 'Booking',
                method : 'equal to, not equal to', // return only records that match search criteria
                fields : 'id, project_taskid, hours', // specify fields to be returned
                attributes : [ // Limit attribute is required; type is Attribute
                    {
                        name : 'limit',
                        value : '1000'
                    }                  
                ],
                objects : [ // One object with search criteria; type implied by rr type
                    taskbookings, exclarchivebookings
                ]
            };
                var bookingarrayresults = NSOA.wsapi.read(thistaskbookings);
                if(!arrayIsEmpty(bookingarrayresults)){
                    NSOA.meta.log('error', 'There was an issue getting the bookings for task: ' + taskstoupdate[b]);
                    return;
                }else{
					var hoursarray = [];
                    for (var c=0;c<bookingarrayresults[0].objects.length;c++){
                        hoursarray.push(Number(bookingarrayresults[0].objects[c].hours));
                    }
                    NSOA.meta.log('debug', 'Array of hours ' + JSON.stringify(hoursarray));
                    var sumofhours = hoursarray.reduce(function(priorvalue, nextvalue){
                    return priorvalue + nextvalue;
                }, 0);
                    NSOA.meta.log('debug', 'Sum of hours = ' + sumofhours);
                    var taskupdate = new NSOA.record.oaProjecttask();
                    taskupdate.id = taskstoupdate[b];
                    taskupdate.planned_hours = sumofhours;
                    var updateattributes = [];
                    // Invoke the modify call
                    var plannedhourupdateresults = NSOA.wsapi.modify(updateattributes, [taskupdate]);
                    NSOA.meta.log('debug', JSON.stringify(plannedhourupdateresults));
                }
                
            }
    
    }
       NSOA.meta.log('debug', JSON.stringify(taskstoupdate));
    
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