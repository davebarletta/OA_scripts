function main(type) {
    //Before Save
    var user = NSOA.form.getValue('user_id');
    var notify = NSOA.form.getValue('notifyIT__c');
    if(notify == '1' || notify === true || notify == 'Yes'){
        var userprops = check_user(user);
        if(userprops[0].generic == '1' || userprops[0].generic === true){
            if(userprops[0].freelancer == '1' || userprops[0].freelancer === true){
                NSOA.meta.log('debug', 'All Conditions passed.');
                return;
            }else{
                NSOA.form.error('notifyIT__c', 'An IT notification can only be generated for Freelance Generics.'); // Can update the error message on this line
            }
        }else{
            NSOA.form.error('notifyIT__c', 'An IT notification can only be generated for Freelance Generics.'); // Can update the error message on this line
        }
    }else{
        NSOA.meta.log('debug', 'No Notification to be sent.');
        return;
    }
}

function check_user(user){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var user_conditions = new NSOA.record.oaUser();
    user_conditions.id = user;    
        readRequest[0] = {
            type: "User",
            fields: "id, generic, isFreelancer__c",
            method: "equal to",
            objects: [user_conditions],
            attributes: [{
                name: "limit",
                value: "1"
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    generic: o.generic,
                    freelancer: o.isFreelancer__c
                };
                resultsArray_JSON.push(resultsJSON);
            });

   
    return resultsArray_JSON;
}