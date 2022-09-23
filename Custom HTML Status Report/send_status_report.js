function main(type) {
    // Gathering variables to populate details
    var newr = NSOA.form.getNewRecord();
    var date_utils = require('date_utils');
    var id = newr.id;
    var name = newr.name;
    var summary = newr.sendSummary__c;
    var customer = newr.customer_name;
    var user = NSOA.record.oaUser(newr.userid);
    var pmname = user.name;
    var timestart = newr.timeStart__c;
    var start = date_utils.string_to_date(timestart);
    var timeend = newr.timeEnd__c;
    var end = date_utils.string_to_date(timeend);
    var issuestart = newr.closedIssueStart__c;
    var issStartDate = date_utils.string_to_date(issuestart);
    var issueend = newr.closedIssueEnd__c;
    var issEndDate = date_utils.string_to_date(issueend);
    var companylogo = NSOA.context.getParameter('CompanyLogoURL');
    var recipient = newr.recipientAddress__c ;
    //Variables for Displaying Different Sections
    var checkopen = newr.includeIssues__c;
    var checktime = newr.includeTime__c;
    var checkclosed = newr.showClosedIssues__c;
    var checkmilestones = newr.includeMilestone__c;
    /* For now this doesn't work due to SSL Error in OA server side
    var phases = get_phases(id);
    var response = NSOA.https.post({
    url: 'https://quickchart.io/chart/create',
        body: phases
});
    NSOA.meta.log('debug', 'Response URL ' + JSON.stringify(response)); */
    //
    var emailmessage ='';
    var htmlheader = 
        '<center><img src="' + companylogo + '" alt="" border=3 height=150 width=150></center>'+
        //'<center><img src=https://quickchart.io/chart?c="' + phases + '" alt="" border=3 height=375 width=750></center>'+
        '<table border =\'3\' align = \'center\' style="width:75%">' +
        ' <th colspan="3">Project Status Summary for: ' + name +'</th>' +
        '<tr>'+
        '</tr>'+
            '<tr>' +
			'<th>Project Name</th>' +
        '<th>Customer Name</th>' +
        '<th>Project Manager</th>' +
    '</tr>' +
            '<tr>' + 
        '<td>' + name + '</th>' + 
        '<td>' + customer + '</td>' +
        '<td>' + pmname +' </td>' +
    '</tr>'+
        '</table>';
    if (summary === '1'){
        if (checktime === '1'){
        	var timesheets = get_timesheets(id, start, end);
            emailmessage = emailmessage + timesheets;
        }
        
        if(checkopen === '1'){
            var issues = get_open_issues(id);
            emailmessage = emailmessage+ issues;
        }
        
        if(checkclosed === '1'){
            var closedissues = get_closed_issues(id, issStartDate, issEndDate);
            emailmessage = emailmessage + closedissues;
        }
        
        if(checkmilestones === '1'){
        	var milestones = get_milestones(id);
            emailmessage = emailmessage + milestones;
        }
        
        var msg = {
         to: [recipient],
         subject: "Project Status Summary for " + name,
         format: "HTML",
         body: htmlheader + emailmessage 
         };
		 NSOA.meta.sendMail(msg);
        reset_project(id);
        NSOA.meta.log('debug', 'Scripting units used: ' + NSOA.context.remainingUnits());
    }else{return;}
}

function get_timesheets(project, start, end){
    NSOA.meta.log('debug', 'Start: ' + start + ' End: ' + end);
    var date_utils = require('date_utils');
    var searchstart = new Date(start);
    var searchend = new Date(end);
    searchstart.setDate(start.getDate() - 1);
    searchend.setDate(end.getDate() + 1);
    var starts = date_utils.remove_time_create_string(start);
    var ends = date_utils.remove_time_create_string(end);
    var datenewer = date_utils.create_oa_date(searchstart);
    var dateolder = date_utils.create_oa_date(searchend);
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var htmlstring = '';
    var returnstring = '';
    var tableheader = '<table border =\'3\' align = \'center\' style="width:75%">' +
        	'<th colspan = 4> Time Entries for period between ' + starts + '-'+ ends +  '</th> ' +
                          '<tr>' +
                            '<th>User</th>' +
                            '<th>Date</th>' +
                			'<th>Hours</th>' +
                			'<th>Task</th>' +
                         ' </tr>';
    var tablefooter = '</table>';
    var totalhours = 0;
    NSOA.meta.log('debug', 'Project: ' + project + ' datenewer: ' + searchstart + ' dateolder: ' + searchend);
    var task_conditions = new NSOA.record.oaTask();
    task_conditions.projectid = project;

    while (limitReached === false) {

        readRequest[0] = {
            type: "Task",
            fields: "id, date, decimal_hours, userid, projecttaskid",
            method: "equal to",
            objects: [task_conditions, datenewer, dateolder],
            attributes: [{name: "limit", value: increment + "," + pageSize},
                        {name: "filter", value: "newer-than,older-than"},
            			{name: "field", value: "date,date"}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        NSOA.meta.log('debug','Time Entry Result: ' + JSON.stringify(resultsArray));
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			 
            resultsArray[0].objects.forEach(function (o) {
                var task = NSOA.record.oaProjecttask(o.projecttaskid);
                var user = NSOA.record.oaUser(o.userid);
                var username = user.name;
                var taskname = task.name;
                var newline = '';
				newline = '<tr>' +
                            '<td>' + username +'</td>' +
                            '<td>' + date_utils.remove_time_from_string(o.date) + '</td>' +
                            '<td>' + o.decimal_hours + '</td>' + 
                    		'<td>' + taskname + '</td>' +
                         ' </tr>';
                totalhours = totalhours + Number(o.decimal_hours);
                htmlstring = htmlstring + newline;
            });
            
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    var summaryline = '<tr>' +
                            '<th></th>' +
                            '<th></th>' +
        					'<th>Total Hours: ' + totalhours + '</th>' +
                			'<th></th>' +       					
                         ' </tr>';
   	returnstring = tableheader + htmlstring + summaryline + tablefooter;
    return returnstring;
}

function get_open_issues(project){
    var date_utils = require('date_utils');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var htmlstring = '';
    var returnstring = '';
    var tableheader = '<table border =\'3\' align = \'center\' style="width:75%">' +
        	' <th colspan = 4> Currently Open Issues</th>' +
                          '<tr>' +
                            '<th>Issue Name</th>' +
                            '<th>Notes</th>' +
                			'<th>Assigned to</th>' +
                			'<th>Date Required</th>' +
                         ' </tr>';
    var tablefooter = '</table>';
    var issue_conditions = new NSOA.record.oaIssue();
    issue_conditions.project_id = project;
    issue_conditions.issue_status_id = 2;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Issue",
            fields: "id, description, date_resolution_required, owner_id, issue_notes",
            method: "equal to",
            objects: [issue_conditions],
            attributes: [{name: "limit", value: increment + "," + pageSize}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			 
            resultsArray[0].objects.forEach(function (o) {
                var newline = '';
                var owner = NSOA.record.oaUser(o.owner_id);
                var name = owner.name;
                
				newline = '<tr>' +
                            '<td>' + o.description +'</td>' +
                            '<td>' + o.issue_notes + '</td>' +
                            '<td>' + name + '</td>' + 
                    		'<td>' + date_utils.remove_time_from_string(o.date_resolution_required) + '</td>' +
                         ' </tr>';
                htmlstring = htmlstring + newline;
            });
            
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   	returnstring = tableheader + htmlstring + tablefooter;
    return returnstring;
}

function get_closed_issues(project, start, end){
    var date_utils = require('date_utils');
    var searchstart = new Date();
    var searchend = new Date();
    searchstart.setDate(start.getDate() - 1);
    searchend.setDate(end.getDate() + 1);
    var starts = date_utils.remove_time_create_string(start);
    var ends = date_utils.remove_time_create_string(end);
    var datenewer = date_utils.create_oa_date(searchstart);
    var dateolder = date_utils.create_oa_date(searchend);
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var htmlstring = '';
    var returnstring = '';
    var tableheader = '<table border =\'3\' align = \'center\' style="width:75%">' +
        	'<th colspan = 14> Closed Issues for period between ' + starts + '-'+ ends +  '</th> ' +
                          '<tr>' +
                            '<th>Issue Name</th>' +
                            '<th>Notes</th>' +
                			'<th>Assigned to</th>' +
                			'<th>Date Resolved</th>' +
                         ' </tr>';
    var tablefooter = '</table>';
    var iss_conditions = new NSOA.record.oaIssue();
    iss_conditions.project_id = project;
	iss_conditions.issue_status_id = 6;
    while (limitReached === false) {

        readRequest[0] = {
            type: "Issue",
            fields: "id, description, date_resolved, owner_id, issue_notes",
            method: "equal to",
            objects: [iss_conditions, datenewer, dateolder],
            attributes: [{name: "limit", value: increment + "," + pageSize},
                        {name: "filter", value: "newer-than,older-than"},
            			{name: "field", value: "date_resolved,date_resolved"}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			 
            resultsArray[0].objects.forEach(function (o) {
                var user = NSOA.record.oaUser(o.owner_id);
                var username = user.name;
                var newline = '';
				newline = '<tr>' +
                            '<td>' + o.description +'</td>' +
                            '<td>' + o.issue_notes + '</td>' +
                            '<td>' + username + '</td>' + 
                    		'<td>' + date_utils.remove_time_from_string(o.date_resolved) + '</td>' +
                         ' </tr>';
                htmlstring = htmlstring + newline;
            });
            
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   	returnstring = tableheader + htmlstring + tablefooter;
    return returnstring;
}

function get_milestones(project){
    var date_utils = require('date_utils');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var htmlstring = '';
    var returnstring = '';
    var tableheader = '<table border =\'3\' align = \'center\' style="width:75%">' +
        ' <th colspan = 2>Project Milestones: </th>' +
                          '<tr>' +
                            '<th>Milestone Name</th>' +
                            '<th>Date</th>' +
                         ' </tr>';
    var tablefooter = '</table>';
    var pt_conditions = new NSOA.record.oaProjecttask();
    pt_conditions.projectid = project;
    pt_conditions.classification = 'M';
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projecttask",
            fields: "id, name, calculated_starts",
            method: "equal to",
            objects: [pt_conditions],
            attributes: [{name: "limit", value: increment + "," + pageSize}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			 
            resultsArray[0].objects.forEach(function (o) {
                var newline = '';
				newline = '<tr>' +
                            '<td>' + o.name +'</td>' +
                            '<td>' + date_utils.remove_time_from_string(o.calculated_starts) + '</td>' +
                         ' </tr>';
                htmlstring = htmlstring + newline;
            });
            
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   	returnstring = tableheader + htmlstring + tablefooter;
    return returnstring;
}

function reset_project(project){
    var update_custom = [{name:"update_custom",value:"1"}];
    var obj = new NSOA.record.oaProject();
    obj.id = project;
    obj.sendSummary__c = '0';
    // Invoke the modify call
	var results = NSOA.wsapi.modify(update_custom, [obj]);
}

function get_phases(project){
    var oaproject = NSOA.record.oaProject(project);
    var startdate = oaproject.start_date;
    var enddate = oaproject.finish_date;
    var labels =[];
    var data = [];
    var bgcolor = [];
    var date_utils = require('date_utils');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var pt_conditions = new NSOA.record.oaProjecttask();
    pt_conditions.projectid = project;
    pt_conditions.classification = 'P';
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projecttask",
            fields: "id, name, calculated_starts, calculated_finishes",
            method: "equal to",
            objects: [pt_conditions],
            attributes: [{name: "limit", value: increment + "," + pageSize}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
			 
            resultsArray[0].objects.forEach(function (o) {
                var calcstart = new Date(o.calculated_starts);
                var calcfinish = new Date(o.calculated_finishes);
                labels.push(o.name);
                data.push([date_utils.string_to_date(o.calculated_starts), date_utils.string_to_date(o.calculated_finishes)]);
                bgcolor.push('rgb(255, 99, 132, 1.0)');              
            });
            
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    var x = {chart: { 
  type: 'horizontalBar',
        chart: 'Gantt',
  data: {
    labels: labels,
    datasets: [{
      data: data,
      backgroundColor: bgcolor,
    }, ],
  },
  options: {
    legend: {
      display: false
    },
    annotation: {
      annotations: [{
        type: 'line',
        mode: 'vertical',
        scaleID: 'x-axis-0',
        value: new Date(),
        borderColor: 'red',
        borderWidth: 1,
        label: {
          enabled: true,
          content: 'Today',
          position: 'top'
        }
      }]
    },
    scales: {
      xAxes: [{
        position: 'top',
        type: 'time',
        time: {
          unit: 'week'
        },
        ticks: {
          min: startdate,
          max: enddate,
        }
      }],
    },
  },
    }};
    NSOA.meta.log('debug', JSON.stringify(x));
    return x;
    
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