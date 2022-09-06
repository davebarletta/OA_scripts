function main(type) {
    //On Submit
    var service = NSOA.form.getValue('category_id');
NSOA.meta.log('debug', 'Service Value: ' + service);
    if(service == 31){//change to parameter, Win Bonus Service ID
        
        NSOA.form.setValue('winBonusAssociated__c', true);
    }
    var override = NSOA.form.getValue('financeOverride__c');
	if (override == '0' || override === false){
        var date_utils = require('date_utils');
        var billdate = NSOA.form.getValue('start_date');
        var milestone = NSOA.form.getValue('start_milestone');
        if(isEmpty(billdate)){
            NSOA.meta.log('debug', 'Milestone Selected for calculation...' + milestone);
            var milestonedate = get_milestone_start(milestone);
            billdate = date_utils.string_to_date(milestonedate);
        }
        var pymntterms = NSOA.form.getValue('brPaymentTerms__c');
        var paymentoffset;
        try{
            switch(pymntterms){
            case 'Due on receipt' : paymentoffset = 0; 
                break;
            case '1% 10 Net 30' : paymentoffset = 30; 
                break;
            case '14 Days' : paymentoffset = 14; 
                break;
            case 'Net 15' : paymentoffset = 15; 
                break;
            case '2% 10 Net 30' : paymentoffset = 30; 
                break;
            case '28 Days' : paymentoffset = 28; 
                break;
            case '30 Days' : paymentoffset = 30;
                break;
            case '45 Days' : paymentoffset = 45;
                break;
            case 'Net 60' : paymentoffset = 60;
                break;
            default : NSOA.meta.log('error', 'Unable to calculate date offset.'); 

        }

        var paydate = new Date(billdate.getTime() + (paymentoffset * 24 * 60 * 60 * 1000));
        NSOA.form.setValue('expectedBillDate__c',paydate);
        }
        catch(error){
            NSOA.meta.log('error',error);
        }
    }else{
        var overridedate = NSOA.form.getValue('dateOverride__c');
        NSOA.form.setValue('expectedBillDate__c',overridedate);
        return;
    }
}

function get_milestone_start(id){
    var milestone = new NSOA.record.oaProjecttask();
    milestone.id = id;
    // Define the read request
    var readRequest = {
        type : 'Projecttask',
        method : 'equal to', 
        fields : 'id, starts', 
        attributes : [{name : 'limit', value : '1'}],
        objects : [milestone]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    return results[0].objects[0].starts;

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