function main(type) {
    var date_utils = require('date_utils');
    var date = NSOA.form.getValue('date'); 
    var datestring = date_utils.date_to_forex_date(date);
    NSOA.meta.log('debug', 'Date ' + datestring);
	var qty = NSOA.form.getValue('poQuantity__c');
    var rate = NSOA.form.getValue('poRate__c');
    var cusprjid = NSOA.form.getValue('customer_project');
    var prjid = cusprjid.substr(cusprjid.lastIndexOf(":") + 1);
    var isscurrency = NSOA.form.getValue('issCurrencyPicklist__c');
    var costtype = NSOA.form.getValue('issProductforPo__c');
    var vendor = NSOA.form.getValue('poVendor__c');
    var project = NSOA.record.oaProject(prjid);
    var prjcurrency = project.currency;
	var total = Number(qty) * Number(rate);
    var convertedtotal = get_exchange_rate(prjcurrency, isscurrency, datestring, total);
    NSOA.meta.log('debug', 'Calculated Amount ' + total);
    NSOA.wsapi.disableFilterSet(true);
    NSOA.form.setValue('poCurrency__c ', prjcurrency);
    NSOA.form.setValue('poAmount__c', total);
    NSOA.form.setValue('poNumAmount__c', total);
    NSOA.form.setValue('convertedPOTotal__c', convertedtotal);
    if(!isEmpty(vendor) && !isEmpty(costtype) && !isEmpty(isscurrency)){
        NSOA.form.setValue('sendtons__c', true);
    }else{
        NSOA.meta.log('info', 'This PO is not ready to send to NetSuite');
    }
    var actual = NSOA.form.getValue('poActualAmount__c');
    if(actual > 0){
        if(total < actual){
            NSOA.form.error('poRate__c', 'This adjustment will lower the PO value below what has already been invoiced ' + actual + ' ' + isscurrency);
        }
    }
    NSOA.wsapi.disableFilterSet(false);
    
}

function get_exchange_rate(prjcurrency, ricurrency, date, amount){
    NSOA.meta.log('debug', 'Exchange rate details - Amount: '+ amount + ' Convert from: ' + ricurrency + ' Convert To: ' + prjcurrency);
    var url = String('https://api.exchangerate.host/convert?amount='+amount+'&from='+ricurrency+'&to='+prjcurrency);
    var response = NSOA.https.get({
        url: url  
    });
    NSOA.meta.log('info', 'API Ex Rate Response: '+JSON.stringify(response));
    NSOA.meta.log('info', 'The converted amount: '+response.body.result);
	return response.body.result;
    
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