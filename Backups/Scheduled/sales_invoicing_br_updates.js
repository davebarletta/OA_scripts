function main() {
    NSOA.wsapi.disableFilterSet(true);
    var newcharges = get_new_charges();
    get_expected_pymnt(newcharges);
    var recentcharges = get_recent_charges();
    NSOA.meta.log('debug', 'Charges that need to be processed '+ JSON.stringify(recentcharges));
    var invoices = get_invoice_number(recentcharges);
    NSOA.meta.log('debug', 'Charges with invoice numbers '+ JSON.stringify(invoices));
    var payments = check_payments(invoices);
    NSOA.meta.log('debug', 'Payments looked up '+ JSON.stringify(payments));
    var updbrs = update_brs(payments);
    NSOA.wsapi.disableFilterSet(false);
}

function get_recent_charges(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var slip_conditions = new NSOA.record.oaSlip();
    slip_conditions.updatedOriginalBR__c = '';
    var not_conditions = new NSOA.record.oaSlip();
    not_conditions.project_billing_ruleid = "";
    not_conditions.invoiceid = "";

    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip",
            fields: "id, project_billing_ruleid, invoiceid",
            method: "equal to, not equal to",
            objects: [slip_conditions, not_conditions],
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
                if(o.project_billing_ruleid !== '' && o.invoiceid !== ''){
                    resultsJSON = {
                        id: o.id,
                        brid: o.project_billing_ruleid,
                        invoiceid: o.invoiceid,
                        invoicenum: '',
                        paymentstatus: '',
                        invoicetotal: '',
                        percentpaid: '',
                        expectedpymnt: ''
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

function get_new_charges(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 20;
    var minutespriorvalue = new Date(today.getTime() - (minutesprior * 60 * 1000));
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = minutespriorvalue.getDate();
    datenewer.month = (minutespriorvalue.getMonth()+1);
    datenewer.year = minutespriorvalue.getFullYear();
    datenewer.hour= minutespriorvalue.getHours();
    datenewer.second = minutespriorvalue.getSeconds();
    datenewer.minute = minutespriorvalue.getMinutes();
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var slip_conditions = new NSOA.record.oaSlip();
    slip_conditions.updatedOriginalBR__c = '';
    var not_conditions = new NSOA.record.oaSlip();
    not_conditions.project_billing_ruleid = "";

    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip",
            fields: "id, project_billing_ruleid, invoiceid",
            method: "equal to, not equal to",
            objects: [slip_conditions, not_conditions, datenewer],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize
            },
            {
                name : 'filter',
                value : 'newer-than'
            },
            {
                name: "field",
                value: "created"
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
                if(o.project_billing_ruleid !== ''){
                    resultsJSON = {
                        id: o.id,
                        brid: o.project_billing_ruleid,
                        invoiceid: o.invoiceid,
                        invoicenum: '',
                        paymentstatus: '',
                        invoicetotal: '',
                        percentpaid: '',
                        expectedpymnt: ''
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

function get_invoice_number(array){
    var returnarray =[];
	for (var i =0; i<array.length; i++){
        var inv = new NSOA.record.oaInvoice();
        inv.id = array[i].invoiceid;
        // Define the read request
        var invreadRequest = {
            type : 'Invoice',
            method : 'equal to',
            fields : 'id, nsInvoiceNum__c, total',
            attributes : [{name : 'limit', value : '1'}],
            objects : [inv]
        };
        // Invoke the read call
        var invresults = NSOA.wsapi.read(invreadRequest);
        if(!isEmpty(invresults)){
            if(invresults[0].objects[0].nsInvoiceNum__c === '' || invresults[0].objects[0].nsInvoiceNum__c === null){
                
                //NSOA.meta.log('debug', 'Invoice has not been sent to NetSuite, removing index ' + i + ' from Array.');
            }else{
                array[i].invoicenum = invresults[0].objects[0].nsInvoiceNum__c;
                array[i].invoicetotal = invresults[0].objects[0].total;
                returnarray.push(array[i]);
            }
        }else{continue;}
        
    }  
    return returnarray;
}

function check_payments(array){
    var returnarray =[];
	for (var i =0; i<array.length; i++){
        var inv = new NSOA.record.oaPayment();
        inv.invoiceid = array[i].invoiceid;
        // Define the read request
        var payreadRequest = {
            type : 'Payment',
            method : 'equal to',
            fields : 'id, total',
            attributes : [{name : 'limit', value : '1000'}],
            objects : [inv]
        };
        // Invoke the read call
        var payresults = NSOA.wsapi.read(payreadRequest);
        if(!isEmpty(payresults[0].objects)){
            var paymenttotal = 0;
            for(var j = 0; j< payresults[0].objects.length; j++){
                paymenttotal = paymenttotal + Number(payresults[0].objects[0].total);
            }
            if (Number(paymenttotal) >= Number(array[i].invoicetotal)){
                array[i].paymentstatus = 'Paid in full';
                array[i].percentpaid = '100%';
                returnarray.push(array[i]);
                }else{
                    array[i].paymentstatus = 'Partial Payment Received';
                    var percentcalc = ((Number(paymenttotal)/Number(array[i].invoicetotal))*100).toFixed(2);
                    array[i].percentpaid = percentcalc+'%';
                    returnarray.push(array[i]);
                }
        }else{
            array[i].paymentstatus = 'Not Yet Due';
            array[i].percentpaid = '0%';
            returnarray.push(array[i]);
        }
        
    }  
    return returnarray;
}

function get_expected_pymnt(array){
    var date_utils = require('date_utils');
    var updatestomake = [];
    var attributes = [{name:"update_custom",value:"1"}];
    for (var i =0; i<array.length; i++){
        var pbr = new NSOA.record.oaProjectbillingrule();
        pbr.invoiceid = array[i].invoiceid;
        // Define the read request
        var pbrreadRequest = {
            type : 'Projectbillingrule',
            method : 'equal to',
            fields : 'id, expectedBillDate__c',
            attributes : [{name : 'limit', value : '1'}],
            objects : [pbr]
        };
        var pbrresults = NSOA.wsapi.read(pbrreadRequest);
         if(!isEmpty(pbrresults[0].objects[0].expectedBillDate__c)){
             var paydate = date_utils.date_to_string(pbrresults[0].objects[0].expectedBillDate__c);
             var obj = new NSOA.record.oaSlip();
             obj.id = array[i].id;
			 obj.expectedPayDatefromBr__c = paydate;
             updatestomake.push(obj);             
         }else{continue;}
    }
    var results = NSOA.wsapi.modify(attributes, updatestomake);
    NSOA.meta.log('debug', 'Charge Update Results: ' + JSON.stringify(results));
    
}

function update_brs(array){
    var updatestomake = [];
    var attributes = [{name:"update_custom",value:"1"}];
    for (var i =0; i<array.length; i++){
        var obj = new NSOA.record.oaProjectbillingrule();
        obj.id = array[i].brid;
        obj.brinvPaymentStatus__c = array[i].paymentstatus;
        obj.brInvoiceTotal__c = array[i].invoicetotal;
        obj.brPercentInvPaid__c =array[i].percentpaid;
        obj.brInvoiceNum__c = array[i].invoicenum;
        obj.invInternalId__c = array[i].invoiceid;
        obj.slipInternalId__c = array[i].id;
        updatestomake.push(obj);
    }
    var results = NSOA.wsapi.modify(attributes, updatestomake);
    NSOA.meta.log('debug', 'BR Update Results: ' + JSON.stringify(results));
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