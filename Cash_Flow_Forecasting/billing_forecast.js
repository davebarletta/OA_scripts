function main(type) {
    // PUT YOUR CODE HERE
    NSOA.meta.log('debug', "Script is running");
    var update_custom = {
            name : 'update_custom',
            value : '1'
        };
    var thisrecord = NSOA.form.getNewRecord();
    var project = thisrecord.projectid;
    var brid = thisrecord.id;
    var brname = thisrecord.name;
    var pymntamount = thisrecord.amount;
    var brexternalID = thisrecord.cashFlowRecord__c;
    var brcurrency = thisrecord.currency;
    var paydate = thisrecord.expectedBillDate__c;
    NSOA.meta.log('debug', 'BR Ext ID: ' + brexternalID);
    
    try{
        if(brexternalID === '' || brexternalID === null){
        // Define a category object to create/update in OpenAir
        var slipforpaymentdate = new NSOA.record.oaSlip();
        slipforpaymentdate.notes = 'Expected Payment for ' + brname;
        slipforpaymentdate.description = 'Expected Payment for ' + brname;
        slipforpaymentdate.date = paydate;
        //slipforpaymentdate.expectedPayment__c = pymntamount;
        slipforpaymentdate.total = pymntamount;
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
            slipupdate.date = paydate;
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
    
    
        
    }catch (error){
        NSOA.meta.log('error', error);
    }
}