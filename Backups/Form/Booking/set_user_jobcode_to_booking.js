function main(type) {
    //After Save
    // Get all the values on the fields on the form
	var newr = NSOA.form.getNewRecord();
    NSOA.meta.log('debug', JSON.stringify(newr));
    var thisrecord = newr.id;
    NSOA.meta.log('debug', 'This Record: ' + thisrecord);
    var user = newr.userid;
    NSOA.meta.log('debug', 'User ID: ' + user);
    var userarray = check_user(user);
    update_jobcode(userarray, thisrecord);
}

function check_user(id){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var user = new NSOA.record.oaUser();
    user.id = id;    

    while (limitReached === false) {

        readRequest[0] = {
            type: "User",
            fields: "id, job_codeid",
            method: "equal to",
            objects: [user],
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
                    jobcode: o.job_codeid
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    NSOA.meta.log('debug', 'User Results: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function update_jobcode(userdetails, record){
    var update_custom = [{name:"update_custom",value:"1"}];
    var obj = new NSOA.record.oaBooking();
    obj.id = record;
    obj.job_codeid = userdetails[0].jobcode;
    // Invoke the modify call
	var results = NSOA.wsapi.modify(update_custom, [obj]);
    NSOA.meta.log('debug', 'Update Booking Results: ' + JSON.stringify(results));
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