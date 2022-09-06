function main(type) {
    //Before Save
    var oldr = NSOA.form.getOldRecord();
    var savedcur = NSOA.form.getValue('issCurrencyPicklist__c');
    var convertedactual = NSOA.form.getValue('poConvertedActual__c');
    var savedvendor = NSOA.form.getValue('poVendor__c');
    var savedct = NSOA.form.getValue('issProductforPo__c');
    var oldprod = oldr.issProductforPo__c;
    if(oldr.issCurrencyPicklist__c != savedcur && convertedactual > 0 ){
        NSOA.form.error('issCurrencyPicklist__c', 'You cannot change the currency once actuals are associated to this PO.');
    }
    if(oldr.poVendor__c != savedvendor && convertedactual > 0 ){
        NSOA.form.error('poVendor__c', 'You cannot change the vendor once actuals are associated to this PO.');
    }
    if(oldr.issProductforPo__c != savedct && convertedactual > 0 ){
        NSOA.form.error('issProductforPo__c', 'You cannot change the Cost Type once actuals are associated to this PO.');
    }
    if(oldr.sendtons__c == '1' && oldprod != savedct){
        NSOA.form.error('issProductforPo__c', 'You cannot change the Cost Type once the PO has been sent to NetSuite.');
    }
}