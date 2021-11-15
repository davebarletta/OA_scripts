function main(type) {
    var billdate = NSOA.form.getValue('start_date');
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
}