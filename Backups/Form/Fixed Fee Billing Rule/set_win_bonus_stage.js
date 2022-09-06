function main(type) {
    //After Save
    var allValues = NSOA.form.getNewRecord();
    var wbstatus = allValues.winBonusAssociated__c;
    var recordid = allValues.id;
    var projectid = allValues.projectid;    
    NSOA.meta.log('debug', 'Started');
    if (wbstatus == '1' || wbstatus === true){
        //Need to use API update as setValue is not available for slip stage id (Charge Stage Field)
        var obj = new NSOA.record.oaProjectbillingrule();
        obj.id = recordid;
        obj.slip_stageid = 8;
        var attributes = [];
        // Invoke the modify call
        var results = NSOA.wsapi.modify(attributes, [obj]);
        NSOA.meta.log('debug', 'WBstatus: '+ wbstatus + 'Record ID: ' + recordid + ' Results: '+ JSON.stringify(results));
    }else{
        set_percentages(projectid);
        return;
    }
}

function gather_br_totals(project){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var obj = new NSOA.record.oaProjectbillingrule();
    obj.projectid = project;
    obj.type = 'F';
	var not_condition = new NSOA.record.oaProjectbillingrule();
    not_condition.winBonusAssociated__c = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: "Projectbillingrule",
            fields: "id, amount",
            method: "equal to, not equal to",
            objects: [obj, not_condition],
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
                    amount: o.amount,
                    percentoftotal: ''
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function sum_amounts(array){
    var totalallrules = 0;
    for (var i = 0; i < array.length; i++){
        totalallrules = Number(totalallrules) + Number(array[i].amount);
    }
    return totalallrules;
}

function calc_percent_of_sale(array, total){
    for(var i =0; i<array.length; i++){
       var percentcalc = ((Number(array[i].amount)/Number(total))*100).toFixed(2);
       array[i].percentoftotal = percentcalc + '%';
    }
    return array;
}

function set_percentages(project){
    var attributes = [{name:"update_custom",value:"1"}];
    var brtotals = gather_br_totals(project);
    var sums = sum_amounts(brtotals);
    var uparray = calc_percent_of_sale(brtotals,sums);
    var updates =[];
    for(var i =0; i<uparray.length; i++){
        var obj = new NSOA.record.oaProjectbillingrule();
        obj.id = uparray[i].id;
        obj.brPercentTotalSale__c = uparray[i].percentoftotal;
        updates.push(obj);
    }
    var results = NSOA.wsapi.modify(attributes, updates);
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