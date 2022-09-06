function main(type) {
    //After Save
    NSOA.wsapi.disableFilterSet(true);
    NSOA.meta.log('debug', "Script is running");
    var update_custom = {name : 'update_custom', value : '1'};
    var thisrecord = NSOA.form.getNewRecord();
    var project = thisrecord.projectid;
    var brid = thisrecord.id;
    //var charge = check_charge_exists(brid);
    //NSOA.meta.log('debug', 'Charge Search result: ' + JSON.stringify(charge));
    var brname = String(thisrecord.name);
    var slipid = thisrecord.slipInternalId__c;
    var invoiceid = thisrecord.invInternalId__c;
    var pymntamount = thisrecord.amount;
    var override = thisrecord.financeOverride__c;
    var brexternalID = thisrecord.cashFlowRecord__c;
    var brcurrency = thisrecord.currency;
    var paydate = thisrecord.expectedBillDate__c;
    var overridedate = thisrecord.dateOverride__c;
    NSOA.meta.log('debug', 'BR Ext ID: ' + brexternalID);
    
    try{
        if(brexternalID === '' || brexternalID === null){
        // Define a category object to create/update in OpenAir
        var slipforpaymentdate = new NSOA.record.oaSlip();
        slipforpaymentdate.notes = 'Expected Payment for ' + brname;
        slipforpaymentdate.description = 'Expected Payment for ' + brname;
            if(override == '1' || override === true){
                slipforpaymentdate.date = overridedate;
            }
            else{slipforpaymentdate.date = paydate;}
        //slipforpaymentdate.expectedPayment__c = pymntamount;
        slipforpaymentdate.total = pymntamount;
        slipforpaymentdate.cost = pymntamount;
        slipforpaymentdate.rate = pymntamount;
        slipforpaymentdate.slip_stageid = 5;
        slipforpaymentdate.id = brexternalID;
        slipforpaymentdate.currency = brcurrency;
        slipforpaymentdate.projectid = project;
        slipforpaymentdate.type = 'F';
        slipforpaymentdate.categoryid = 27;
         
        var results = NSOA.wsapi.upsert([update_custom], [slipforpaymentdate]);
        var newrecordid = results[0].id;
        NSOA.meta.log('debug', JSON.stringify(results));
        
            // Modify customers email address
            var updbr = new NSOA.record.oaProjectbillingrule();
            updbr.id = brid;
            updbr.cashFlowRecord__c = newrecordid;
            // Invoke the modify call
            var updateresults = NSOA.wsapi.modify([update_custom], [updbr]);
        NSOA.meta.log('debug', JSON.stringify(updateresults));
        }else{
            var slipupdate = new NSOA.record.oaSlip();
            slipupdate.notes = 'Expected Payment for ' + brname;
            slipupdate.description = 'Expected Payment for ' + brname;
            if(override == '1' || override === true){
                slipupdate.date = overridedate;
            }
            else{slipupdate.date = paydate;}
            //slipupdate.expectedPayment__c = pymntamount;
            slipupdate.total = pymntamount;
            slipupdate.rate = pymntamount;
            slipupdate.slip_stageid = 5;
            slipupdate.id = brexternalID;
            slipupdate.currency = brcurrency;
            slipupdate.projectid = project;
            slipupdate.type = 'F';
            slipupdate.categoryid = 27;
            var modifyslip = NSOA.wsapi.modify([update_custom], [slipupdate]);
            
        }
        if(slipid !== ''){
            NSOA.meta.log('debug', 'Slip needs update...');
            update_charge(slipid, paydate);
        }
        if(invoiceid !== ''){
            NSOA.meta.log('debug', 'Invoice needs update...');
            update_invoice(invoiceid, paydate);

        }
        
    NSOA.wsapi.disableFilterSet(false);
    
        
    }catch (error){
        NSOA.meta.log('error', error);
        NSOA.wsapi.disableFilterSet(false);
    }
}

/*function check_charge_exists(brid){
    var resultJson;
    var returnarray = [];
    try{
        var slip = new NSOA.record.oaSlip();
        slip.project_billing_ruleid = brid;
        // Define the read request
        var readRequest = {
            type : 'Slip',
            method : 'equal to', // return only records that match search criteria
            fields : 'id, invoiceid, project_billing_ruleid', // specify fields to be returned
            attributes : [{name : 'limit', value : '1'}],
            objects : [slip]
        };
        // Invoke the read call
        var results = NSOA.wsapi.read(readRequest);
		resultJson = {
            slipid: results[0].objects[0].id,
            invoiceid: results[0].objects[0].invoiceid,
            pbrid: results[0].objects[0].project_billing_ruleid
        };
        returnarray.push(resultJson);
        return returnarray;
    }catch (e){
        return false;
    }
}*/

function update_charge(id,date){
    var obj = new NSOA.record.oaSlip();
	obj.id = id;
	obj.expectedPayDatefromBr__c = date;

    // Not attributes required
    var attributes = [{name : 'update_custom', value : '1'}];

    // Invoke the modify call
    var results = NSOA.wsapi.modify(attributes, [obj]);
}
function update_invoice(id,date){
    var obj = new NSOA.record.oaInvoice();
	obj.id = id;
	obj.brexpectedpay__c = date;

    // Not attributes required
    var attributes = [{name : 'update_custom', value : '1'}];

    // Invoke the modify call
    var results = NSOA.wsapi.modify(attributes, [obj]);
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