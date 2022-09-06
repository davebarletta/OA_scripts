function main(type) {
    //After Save
    var datelib = require('date_utils');
    var allValues = NSOA.form.getAllValues();
    NSOA.meta.log('debug', 'All Values: ' + JSON.stringify(allValues));
    // Get the new record values
    var newr = NSOA.form.getNewRecord();
    NSOA.meta.log('debug', 'New Values: ' + JSON.stringify(newr));
    var user = allValues.user_id;
    var jobcodearray = get_job_code(user);
    var fulluser = NSOA.record.oaUser(user);
    var notifyIT = allValues.notifyIT__c;
    var thisend = allValues.enddate;
    var enddate = datelib.date_to_string(thisend);
    NSOA.meta.log('debug', 'This user: '+ user + 'This end Date: '+ enddate);
    if(fulluser.isFreelancer__c  == '1'){
        var returnuser = check_user(user);
        NSOA.meta.log('debug', JSON.stringify(returnuser));
        var upduser = update_freelancer(returnuser,thisend);
    }
}

function check_user(id){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var user = new NSOA.record.oaUser();
    user.id = id;    

    while (limitReached === false) {

        readRequest[0] = {
            type: "User",
            fields: "id, freelancerEnd__c,isFreelancer__c",
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
                    end_date: o.freelancerEnd__c,
                    freelancerCheck: o.isFreelancer__c
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function update_freelancer(array,thisend){
    var datelib = require('date_utils');
    var currentend = datelib.string_to_date(array[0].end_date);
    if(array[0].freelancerCheck === '1'){
        NSOA.meta.log('debug', 'Freelancer check passed.');
        if(currentend < thisend || array[0].end_date == '0000-00-00'){
            NSOA.meta.log('debug', 'Date Check Passed');           
            var upduser = new NSOA.record.oaUser();
            upduser.id = array[0].id;
            upduser.freelancerEnd__c = datelib.date_to_string(thisend);
            NSOA.meta.log('debug', 'User to be updated '+ JSON.stringify(upduser));
            // Invoke the modify call
            var attributes = [{name:"update_custom",value:"1"}];
            var results = NSOA.wsapi.modify(attributes, [upduser]);
            NSOA.meta.log('debug', 'Update Results: '+ JSON.stringify(results));
            return results;
        }else{return;}
    }else{return;}
}

function get_job_code(id){
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
    NSOA.meta.log('debug', 'Job Code Array: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function update_job_code(array, bookingid){
    var obj = new NSOA.record.oaBooking();
    obj.id = bookingid;
    obj.job_codeid = array[0].jobcode;
    // Not attributes required
    var attributes = [];

    // Invoke the modify call
    var results = NSOA.wsapi.modify(attributes, [obj]);
    NSOA.meta.log('debug', 'Job Code Update results: '+ JSON.stringify(results));
    return results;
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