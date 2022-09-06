function main(type) {
    //Before Approval
    var oldr = NSOA.form.getOldRecord();
    var user = NSOA.wsapi.whoami();
    var check = check_last_week(oldr,user);
	var anytime = check_anytime(user);
    if(anytime === false){
        if(check === true){
            NSOA.form.error('', 'You must submit time for last week before you can submit this timesheet.');
        }
    }

}

function check_last_week(oldr, user){
    var date_utils = require('date_utils');
	var startdate = date_utils.string_to_date(oldr.starts);
    var datetocheck = startdate.setDate(startdate.getDate()-5);
    var stringdate = date_utils.date_to_string(datetocheck);
    NSOA.meta.log('debug', 'Date used for Check: ' + stringdate);
    var task = new NSOA.record.oaTask();
    task.date = stringdate;
    task.userid = user.id;
    // Define the read request
    var readRequest = {
        type : 'Task',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, date', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1000'
            },
            {
                name: 'filter',
                value: 'approved-timesheets'
            }
        ],
        objects : [task]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'Task Read Check: ' + JSON.stringify(results));
    var check = isEmpty(results[0].objects);
    NSOA.meta.log('debug', 'Check :  ' + check);
    return check;
}

function check_anytime(user){
    var task = new NSOA.record.oaTask();
    task.userid = user.id;
    // Define the read request
    var readRequest = {
        type : 'Task',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, date', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1000'
            },
            {
                name: 'filter',
                value: 'approved-timesheets'
            }
        ],
        objects : [task]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'Task Read Check: ' + JSON.stringify(results));
    var check = isEmpty(results[0].objects);
    NSOA.meta.log('debug', 'Check :  ' + check);
    return check;
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