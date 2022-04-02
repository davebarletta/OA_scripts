function main() {
    var newprs = find_submitted_pr();
    NSOA.meta.log('debug', 'New PRs: '+ JSON.stringify(newprs));
    var getitems = get_items(newprs);
    //PR is not Editable in API - so following function is useless
    //var updprs = update_prs(newprs);
}

function find_submitted_pr(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 5;
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
    var pr_conditions = new NSOA.record.oaPurchaserequest();
    pr_conditions.prSubmitted__c = '1';
    pr_conditions.netsuite_purchaserequest_id__c ='';
    //pr_conditions.prProcessed__c = '0';
    var not_conditions = new NSOA.record.oaPurchaserequest();
    not_conditions.name = 'Processed'; 
    while (limitReached === false) {

        readRequest[0] = {
            type: "Purchaserequest",
            fields: "id, notes, prCostType__c, description",
            method: "equal to",
            objects: [pr_conditions,datenewer],
            attributes: [{
                name: "limit",
                value: increment + "," + pageSize,
                
            },
                        {
                name : 'filter',
                value : 'newer-than'
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
                    vendor: o.notes,
                    costtype: o.prCostType__c,
                    description: o.description
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function get_items(array){
    for(var i =0; i<array.length; i++){
        var readRequest = [], resultsJSON, resultsArray_JSON = [];
        var increment = 0, pageSize = 1000, limitReached = false;
        var ri_conditions = new NSOA.record.oaRequest_item();
        ri_conditions.purchaserequestid = array[i].id; 
        while (limitReached === false) {

            readRequest[0] = {
                type: "Request_item",
                fields: "id, purchaserequestid, currency, cost, rate, date, projectid, vendorid, riPrjTaskId__c, quantity, productid, total, name, riTrackingNum__c, isBillablePI__c",
                method: "equal to",
                objects: [ri_conditions],
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
                        pr: o.purchaserequestid,
                        currency: o.currency,
                        cost: o.cost,
                        rate: o.rate,
                        date: o.date,
                        project: o.projectid,
                        vendor: o.vendorid,
                        task: o.riPrjTaskId__c,
                        quantity: o.quantity,
                        product: o.productid,
                        total: o.total,
                        supplier: o.name,
                        ponumber: o.riTrackingNum__c,
                        rechargeable: o.isBillablePI__c
                    };
                    resultsArray_JSON.push(resultsJSON);
                    NSOA.meta.log('debug', JSON.stringify(resultsArray_JSON));
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
    	}
   		for (var j = 0; j< resultsArray_JSON.length; j++){
            var issue = new NSOA.record.oaIssue();
            issue.date = resultsArray_JSON[j].date;
            issue.poAmount__c = resultsArray_JSON[j].total;
            issue.poVendor__c = resultsArray_JSON[j].vendor;
            issue.poTaskId__c = resultsArray_JSON[j].task;
            issue.project_task_id = resultsArray_JSON[j].task;
            issue.project_id = resultsArray_JSON[j].project;
            issue.poQuantity__c = resultsArray_JSON[j].quantity;
            issue.requestMemo__c = array[i].description;
            //issue.poItem__c = resultsArray_JSON[j].product;
            issue.poRate__c = resultsArray_JSON[j].total;
            issue.issue_category_id = 6;
            issue.issue_stage_id = 2;
            issue.owner_id = 1;
            issue.poCurrency__c = resultsArray_JSON[j].currency;
            issue.prId__c = resultsArray_JSON[j].pr;
            issue.description = 'PR created for: ' + resultsArray_JSON[j].supplier;
            issue.issExternalID__c = resultsArray_JSON[j].id;
            issue.issPoNum__c = resultsArray_JSON[j].ponumber;
            issue.itemMemo__c = resultsArray_JSON[j].supplier;
            issue.rechargeableRI__c = resultsArray_JSON[j].rechargeable;
            // Invoke the add call
            var attribute = [{name : "lookup",value : "issExternalID__c"}];
            var results = NSOA.wsapi.upsert(attribute,[issue]);
            NSOA.meta.log('debug', 'Results: ' + JSON.stringify(results));
            var id = results[0].id;
            var nsid = get_ns_id(array[i].costtype);
            NSOA.meta.log('debug', 'NS PRD ID: '+ nsid + ' Record to Update: ' + id);
            var updaterecord = update_record(id, nsid);           
        }
    
    }
    return;
}

/*function update_prs(array){
    for(var i =0; i<array.length; i++){
        var pr_conditions = new NSOA.record.oaPurchaserequest();
        pr_conditions.id = array[i].id;
        pr_conditions.prProcessed__c = '1';
        pr_conditions.name = 'Processed';
        var attributes = [{name:"update_custom",value:"1"}];
        // Invoke the modify call
        var results = NSOA.wsapi.modify(attributes, [pr_conditions]);
    }
}*/

function get_ns_id(product){
    var prd = new NSOA.record.oaCategory_3();
    prd.id = product;
    // Define the read request
    var readRequest = {
        type : 'Category_3',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, cat3NSProductId__c', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [prd]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
	return results[0].objects[0].cat3NSProductId__c;
}

function update_record(id, product){
    // Modify customers email address
    var ri = new NSOA.record.oaIssue();
    ri.id = id;
    ri.poItem__c = product;
    // Not attributes required
    var attributes = [{name:"update_custom",value:"1"}];

    // Invoke the modify call
    var results = NSOA.wsapi.modify(attributes, [ri]);
    NSOA.meta.log('debug',JSON.stringify(results));
    return;
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