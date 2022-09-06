function main() {
    var activeprjs = get_active_projects();
    var producers = unique_producers(activeprjs);
    NSOA.meta.log('debug', 'Producers : ' + JSON.stringify(producers));
    var withtotals = gather_totals(activeprjs);
    var aftercheck = check_array(withtotals);
    NSOA.meta.log('debug', 'Active Project array : ' + JSON.stringify(aftercheck));
    for(var i = 0; i < producers.length; i++){
        var user = NSOA.record.oaUser(producers[i]);
        var emailbody = prepare_email_body(producers[i], aftercheck);
        if (emailbody!== false){
            var msg = {
                 to: ['kiran.ellis@squintopera.com'],
                 subject: "Projects with difference in Revenue for " + user.name,
                 format: "HTML",
                 body: emailbody 
                 };
                 NSOA.meta.sendMail(msg);
        }
    }
    update_projects(aftercheck);
}

function gather_totals(array){
    for(var i =0; i < array.length; i++){
        var brtotal = find_br_total(array[i].id);
        array[i].billrule = brtotal;
        var rrtotal = find_rr_total(array[i].id);
        array[i].revrule = rrtotal;
        var phasetotal = find_phase_total(array[i].id);
        array[i].phases = phasetotal;
    }
    return array;
}

function get_active_projects(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var project = new NSOA.record.oaProject();
    project.active = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Project',
            fields: 'id, prjamount__c, userid, prjCode__c, prjBillingCurrency__c',
            method: 'equal to',
            objects: [project],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        NSOA.meta.log('debug', 'There are ' + resultsArray[0].objects.length + ' Active Projects to process...');

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    prjcode: o.prjCode__c ,
                    billingcurrency: o.prjBillingCurrency__c ,
                    hsamount: o.prjamount__c ,
                    producer: o.userid,
                    revrule: '',
                    billrule: '',
                    phases: '',
                    diffcheck: ''
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
   
    return resultsArray_JSON;
}

function unique_producers(array){
    var uniquearray = [];
    for (var i = 0; i< array.length; i++){
        if(uniquearray.indexOf(array[i].producer) == -1){
            uniquearray.push(array[i].producer);
        }else{
            continue;
        }
    }
    return uniquearray;
}

function find_br_total(prj){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var brsum = 0;
    var obj = new NSOA.record.oaProjectbillingrule();
    obj.projectid  = prj;
    var not = new NSOA.record.oaProjectbillingrule();
    not.categoryid = 22; //Change to Parameter for 'OA Time Entry' service item
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Projectbillingrule',
            fields: 'id, amount',
            method: 'equal to, not equal to',
            objects: [obj, not],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            //NSOA.meta.log('debug', 'BR SUM: ' + 0);
            return 0;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    amount: o.amount                   
                };
                brsum= brsum + Number(o.amount);
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    //NSOA.meta.log('debug', 'BR SUM: ' + brsum);
    return brsum;
}

function find_rr_total(prj){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var rrsum = 0;
    var obj = new NSOA.record.oaRevenue_recognition_rule();
    obj.projectid  = prj;
    var not = new NSOA.record.oaRevenue_recognition_rule();
    not.name = 'Cost Time Entry Journals';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Revenue_recognition_rule',
            fields: 'id, amount',
            method: 'equal to, not equal to',
            objects: [obj, not],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            //NSOA.meta.log('debug', 'RR SUM: ' + 0);
            return 0;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    amount: o.amount                   
                };
                rrsum= rrsum + Number(o.amount);
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    //NSOA.meta.log('debug', 'RR SUM: ' + rrsum);
    return rrsum;
}

function find_phase_total(prj){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var phasesum = 0;
    var obj = new NSOA.record.oaProjecttask();
    obj.projectid  = prj;
    obj.classification  = 'P';
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Projecttask',
            fields: 'id, phaseRevenue__c',
            method: 'equal to',
            objects: [obj],
            attributes: [{
                name: 'limit',
                value: increment + ',' + pageSize
            }]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);

        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
            //NSOA.meta.log('debug', 'Phase SUM: ' + 0);
            return 0;
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected

            resultsArray[0].objects.forEach(function (o) {
                resultsJSON = {
                    id: o.id,
                    amount: o.phaseRevenue__c                   
                };
                phasesum = phasesum + Number(o.phaseRevenue__c);
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
    
    //NSOA.meta.log('debug', 'Phase SUM: ' + phasesum);
    return phasesum;
}

function check_array(array){
    for(var i =0; i < array.length; i++){
        if(Number(array[i].revrule) !== Number(array[i].billrule) || Number(array[i].hsamount) !== Number(array[i].phases) || Number(array[i].revrule) !== Number(array[i].hsamount) || Number(array[i].revrule) !== Number(array[i].phases) || Number(array[i].billrule) !== Number(array[i].hsamount) || Number(array[i].billrule) !== Number(array[i].phases)){
            array[i].diffcheck = '1';
        }else{
            array[i].diffcheck = '0';
        }
    }
    return array;
}

function prepare_email_body(producer, array){
    var tableheader = '<table border =\'3\' align = \'center\' style="width:75%">' +
        '<th colspan = 6> Projects with Revenue Difference: </th> ' +
        '<tr>' +
        '<th>Project Code</th>' +
        '<th>Project Name</th>' +
        '<th>Billing Currency</th>' +
        '<th>Total Project Revenue</th>' +
        '<th>Revenue Rule Total</th>' +
        '<th>Billing Rule Total</th>' +
        '<th>Subproject revenue total</th>' +
        ' </tr>';
    var tablefooter = '</table>';
    var mailbody = '';
    for(var i = 0; i< array.length; i++){
        if(array[i].diffcheck === '1'){
            if(producer == array[i].producer){
                var project = NSOA.record.oaProject(array[i].id);
                var projname = project.name;
                var newline = '';
                newline = '<tr>' +
                    '<td>' + array[i].prjcode +'</td>' +
                    '<td>' + projname +'</td>' +
                    '<td>' + array[i].prjBillingCurrency__c +'</td>' +
                    '<td>' + array[i].hsamount + '</td>' +
                    '<td>' + array[i].revrule + '</td>' + 
                    '<td>' + array[i].billrule + '</td>' +
                    '<td>' + array[i].phases + '</td>' +
                    ' </tr>';
                mailbody = mailbody + newline;
            }else{
                continue;
            }
        }else{
            continue;
        }
    }
    if(mailbody === ''){
        return false;
    }else{
    	var returnstring = tableheader + mailbody + tablefooter;
    	return returnstring;
    }
}

function update_projects(array){
    var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var newslip = new NSOA.record.oaProject();
    		newslip.id = searcharrays[i][j].id;
            newslip.prjrrrtotal__c  = searcharrays[i][j].revrule;
            newslip.prjbrtotal__c  = searcharrays[i][j].brtotal;
            newslip.ruleTotalsDiff__c = searcharrays[i][j].diffcheck;
            newslip.prjtotalphaserev__c = searcharrays[i][j].phases;
            objarray.push(newslip);

        }
        NSOA.meta.log('debug', 'Project Objarray after for: '+ JSON.stringify(objarray));
        var attributes = [{name:"update_custom",value:"1"}];
		var results = NSOA.wsapi.modify(attributes, objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           NSOA.meta.log('debug', i+1 + 'array has been processed...');
        }

    }
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