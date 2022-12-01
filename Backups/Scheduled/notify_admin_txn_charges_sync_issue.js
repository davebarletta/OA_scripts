function main() {
    var activeprjs = get_active_projects();
    var emailmessage ='';
    var tableheader = '<table border =\'3\' align = \'center\' style="width:75%">' +
        	' <th colspan = 6> Projects with identified variance between Billing Transactions and Charges - </th>' +
                          '<tr>' +
                            '<th>Project OA ID</th>' +
                            '<th>Project Name</th>' +
                			'<th>Transaction Total</th>' +
                			'<th>Charge Total</th>' +
        					'<th>Transaction Hours</th>' +
        					'<th>Charge Hours</th>' +
                         ' </tr>';
    var tablefooter = '</table>';
    var tablebody = '';
    for(var i =0; i<activeprjs.length; i++){
        var newline = '';
        var charges = sum_charge_data(activeprjs[i].id);
        activeprjs[i].chargeamount = charges[0].totalmoney.toFixed(2);
        activeprjs[i].chargehours = charges[0].totalhour.toFixed(2);
        var txns = sum_txn_data(activeprjs[i].id);
        activeprjs[i].billtxnamount = txns[0].totalmoney.toFixed(2);
        activeprjs[i].billtxnhours = txns[0].totalhour.toFixed(2);
        if(activeprjs[i].billtxnamount != activeprjs[i].chargeamount || activeprjs[i].billtxnhours != activeprjs[i].chargehours){
            var projectdetails = NSOA.record.oaProject(activeprjs[i].id);
            projectname = projectdetails.name;
            newline = '<tr>' +
                            '<td>' + activeprjs[i].id +'</td>' +
                            '<td>' + projectname + '</td>' +
                            '<td>' + activeprjs[i].billtxnamount + '</td>' + 
                    		'<td>' + activeprjs[i].chargeamount + '</td>' +
                			'<td>' + activeprjs[i].billtxnhours + '</td>' +
                			'<td>' + activeprjs[i].chargehours + '</td>' +
                         ' </tr>';
                tablebody = tablebody + newline;
        }
        
    }
    var msg = {
         to: ["dave.barletta@deptagency.com, leonard.khung@deptagency.com"],
         subject: "Projects with variance between charges and transactions",
         format: "HTML",
         body: tableheader + tablebody + tablefooter 
         };
		 NSOA.meta.sendMail(msg);
    NSOA.meta.log('debug','Active Projects complete array: ' + JSON.stringify(activeprjs));
}

function get_active_projects(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var project_conditions = new NSOA.record.oaProject();
    project_conditions.active = '1';
    project_conditions.varianceIgnored__c = '';

    while (limitReached === false) {

        readRequest[0] = {
            type: "Project",
            fields: "id",
            method: "equal to",
            objects: [project_conditions],
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
                    chargeamount: '',
                    chargehours: '',
                    billtxnamount: '',
                    billtxnhours: '',
                    timeentryhours: ''
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function sum_charge_data(project){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var chargetotalmoney =0;
    var chargetotalhours =0;
    var slip_condition = new NSOA.record.oaSlip();
    slip_condition.projectid  = project;    

    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip",
            fields: "id, total, decimal_hours, userid",
            method: "equal to",
            objects: [slip_condition],
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
                if(o.userid == 4035){
                    NSOA.meta.log('debug', 'Skipping Intercompany User');
                }else{
                    chargetotalmoney = chargetotalmoney + Number(o.total);
                	chargetotalhours = chargetotalhours + Number(o.decimal_hours);
                }
				
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    resultsJSON = {
        totalmoney: chargetotalmoney,
        totalhour: chargetotalhours
    };
    
    resultsArray_JSON.push(resultsJSON);
   
    return resultsArray_JSON;
}

function sum_txn_data(project){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var chargetotalmoney =0;
    var chargetotalhours =0;
    var slip_condition = new NSOA.record.oaProjectbillingtransaction();
    slip_condition.projectid  = project;    

    while (limitReached === false) {

        readRequest[0] = {
            type: "Projectbillingtransaction",
            fields: "id, hour, minute, total",
            method: "equal to",
            objects: [slip_condition],
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
                var fraction = Number(o.minute)/60;
                var hoursfigure = Number(o.hour) + fraction;
                chargetotalmoney = chargetotalmoney + Number(o.total);
                chargetotalhours = chargetotalhours + hoursfigure;
				
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    resultsJSON = {
        totalmoney: chargetotalmoney,
        totalhour: chargetotalhours
    };
    
    resultsArray_JSON.push(resultsJSON);
    //var projectdet = NSOA.record.oaProject(project);
    //var projectname = projectdet.name;
    //NSOA.meta.log('debug','Txn data for ' + projectname + ' : ' + JSON.stringify(resultsArray_JSON));
   
    return resultsArray_JSON;
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
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