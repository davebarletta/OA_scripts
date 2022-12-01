function main() {
    var approvallines = read_time_approval_lines();
    NSOA.meta.log('debug','Approval Lines: ' + JSON.stringify(approvallines));
    if (approvallines.length > 0){
        var emailmessage ='The following users have Approvals sitting in their queue, and they have been marked as Inactive in OpenAir. To rectify this, the users will need to be re-activated and someone will need to proxy in as them and Approve or Reject the records on their behalf.</br></br>';
        var tableheader = '<table border =\'3\' align = \'center\' style="width:40%">' +
                ' <th colspan = 1> Users with Approvals - </th>' +
                              '<tr>' +
            	'<th>User Name: </th>' +
                             ' </tr>';
        var tablefooter = '</table>';
        var tablebody = '';
            for(var i =0; i<approvallines.length; i++){
                var newline = '';
                    newline = '<tr>' +
                                    '<td>' + approvallines[i].approver +'</td>' +
                                 ' </tr>';
                        tablebody = tablebody + newline;
                
        
    }
            var msg = {
                 to: ["dave.barletta@deptagency.com, george.baxandall@deptagency.com, esther.heeremans@deptagency.com"],
                 subject: "OpenAir Approvals tied to Inactive Users",
                 format: "HTML",
                 body: emailmessage + tableheader + tablebody + tablefooter 
             };
     	NSOA.meta.sendMail(msg);

    }else{
        NSOA.meta.log('info','Empty :)');
    }
}

function read_time_approval_lines(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var appline = new NSOA.record.oaApprovalLine();
    appline.action = 'P';
    var timesheetcheck = new NSOA.record.oaApprovalLine();
    timesheetcheck.timesheetid = "";
    timesheetcheck.pending_done = "1";
    while (limitReached === false) {

        readRequest[0] = {
            type: "ApprovalLine",
            fields: "id, userid, action, status, timesheetid, pending_done",
            method: "equal to, not equal to",
            objects: [appline, timesheetcheck],
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
                //var timesheet = NSOA.record.oaTimesheet(o.timesheetid);
                //var tsstatus= timesheet.status;
                var user = NSOA.record.oaUser(o.userid);
                var username = user.name;
                var userstatus = user.active;
                if(userstatus != '1'){
                    NSOA.meta.log('debug','User to Approve: ' + username + ' User Status: ' + userstatus);
                    resultsJSON = {
                    id: o.id,
                    approver: username,
                    action: o.action,
                    status: o.status,
                    pendingdone: o.pending_done
                };
                resultsArray_JSON.push(resultsJSON);
                }
                
                
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
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