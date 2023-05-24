///-----------------------------------------------------------------
///   Class:          send_user_welcome
///   Description:    Sends a welcome email to new users giving them information about the system, and how to login
///   Author:         Dave Barletta                    Date: Oct 07, 2022
///   Notes:          Script purpose is for user onboarding
///   Revision History:
///   Name: Initial          Date: Oct-07-22       Description: Initial Version
///-----------------------------------------------------------------

function main() {
    var users = get_users_without_access();
    var emails = create_email_string(users);
    NSOA.meta.log('info', 'Emails: ' + JSON.stringify(emails));
    for (var i=0; i< emails.length; i++){
    var msg = {
                 to: [emails[i].email],
        		 bcc: ['dave.barletta@deptagency.com, george.baxandall@deptagency.com'],
                 subject: "Welcome to OpenAir!",
                 format: "HTML",
                 body: "<h3>Welcome to OpenAir!</h3>" + "<br>" +
"<b>Log-in for first time</b>" +  "<br>"+
"In order to login, please <a href='https://auth.openair.com/login_sso?'>Click Here</a> or copy and paste this link into your browser: https://auth.openair.com/login_sso?" + "<br>" +

"Enter the following details:" +"<ul>" + 
"<li>Company ID: DEPT</li>" +
"<li>User ID: " + emails[i].email + "</li>"+
        "</ul>" +
        
        '</br> Or, you can use the Google App Hub and bookmark the link for OpenAir' +
        '<ol>' + 
        '<li><b>Step 1:</b> It is important to note that OpenAir works best on Google Chrome browser. Please Open up your Google chrome browser. </li>' +

 
"<li><b>Step 2:</b> Navigate to our Google applications using this link - <a href='https://workspace.google.com/u/0/dashboard'>https://workspace.google.com/u/0/dashboard</a></li>" +

 
'<li><b>Step 3:</b> Click on the OpenAir Icon to take you to your OpenAir home page</li>' + 
 
 
'<li><b>Step 4:</b> After getting to your OpenAir home page, bookmark this URL by:' +
        '<ol>'+
			'<li>Click on your Favorites</li>'+
			'<li>Edit Bookmark Name</li>' +
       '</ol></li>'+
       ' </ol>' +

"<b>More support?</b>" + "<br>" + 


"<li><i>Slack Channel:</i> If you have questions, you can reach out to the slack channel <a href='https://deptagency.slack.com/archives/C045KMFB3RP'>#dtuk-project-openairquestions</a>.</li>" + 


"<li><i>Technical issue?</i> For technical issues, please send a slack message to George Baxandall. He will raise a ticket and log all technical issues. </li>" +


"<b>OpenAir Help Center</b>" + "<br>" + 
"We’ve also launched our <a href='https://sites.google.com/deptagency.com/openair-help-center'>OpenAir Help Center.</a> Follow this link to find out more about OpenAir, have a look at the support materials, get answers on <i>frequently asked questions</i> (FAQ) and other information you need related to OpenAir. This site will be continuously updated over the coming months so please continue to come back and check it out." + "<br>" +

"We hope that you have had a smooth go live and will easily adopt OpenAir in your daily routines." + "<br>" +

"Cheers!"


                 };
        
        NSOA.meta.log('debug', 'Mail sent to: ' + emails[i].email);
   	NSOA.meta.sendMail(msg); 
    }
    update_users(users);
}

function get_users_without_access(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var user = new NSOA.record.oaUser();
    user.active = '1';
    user.userWelcomeEmailSent__c = '';
    user.wave1Welcome__c ='1';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'User',
            fields: 'id, email, userWelcomeEmailSent__c',
            method: 'equal to',
            objects: [user],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' Active Users to process...');

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                var thisuser = NSOA.record.oaUser(o.id);
                var thisuseremail = thisuser.addr_email;
                var uniquepass = makeid(10);
                resultsJSON = {
                    id: o.id,
                    email: thisuseremail,
                    welcomesent: o.userWelcomeEmailSent__c,
                    password: uniquepass
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    NSOA.meta.log('debug', 'Returned Users: ' + JSON.stringify(resultsArray_JSON));
    return resultsArray_JSON;
}

function create_email_string(array){
    var emailarray = [];
    for(var i=0; i< array.length; i++){
        var json = {
            email: array[i].email,
            password: array[i].password
        };
        emailarray.push(json);
    }
    return emailarray;
}

function update_users(array){
    var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var user = new NSOA.record.oaUser();
    		user.id = searcharrays[i][j].id;
            user.userWelcomeEmailSent__c = '1';
            //user.password = array[i].password;
            //user.password_forced_change = '1';
            user.nickname = array[i].email;
            objarray.push(user);

        }
        NSOA.meta.log('debug', 'User Objarray after for: '+ JSON.stringify(objarray));
        var attributes = [{name:"update_custom",value:"1"}];
		var results = NSOA.wsapi.modify(attributes, objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + ' array has been processed...');
        }

    }
}

//https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
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