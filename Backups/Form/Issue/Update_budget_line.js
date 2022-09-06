function main(type) {
    //After Save
    var oldr = NSOA.form.getOldRecord();
    var newr = NSOA.form.getNewRecord();
    flag_for_change(type,oldr,newr);
    var recordcurrency = newr.issCurrencyPicklist__c;
    var project = NSOA.record.oaProject(newr.project_id);
    var prjcurrency = project.currency;
    var total = newr.poNumAmount__c;
    var actual = newr.poActualAmount__c;
    var pbrid = newr.issExternalID__c;
    var pocurr = newr.issCurrencyPicklist__c;
    var convertedtotal = newr.convertedPOTotal__c;
    var convertedactual = newr.poConvertedActual__c;
    var convertedremaining = Number(convertedtotal.replace(/-\w{3}/, '')) - Number(convertedactual.replace(/-\w{3}/, ''));
    var convertedrate = get_exchange_rate(prjcurrency, pocurr, newr.poRate__c);
    update_currency(newr,prjcurrency, convertedtotal, convertedactual, total, actual);
    NSOA.meta.log('debug', 'For Calculation : ' + convertedtotal.replace(/-\w{3}/, '') - convertedactual.replace(/-\w{3}/, '')); 
    NSOA.meta.log('debug', 'Converted Total : ' + convertedtotal + ' Converted Actual : ' + convertedactual + ' Converted Remaining : ' + convertedremaining);    
    //if(prjcurrency !== recordcurrency){
        var currenttotalpbt = total_pbts(pbrid);
        var recordstoremove = pbts_to_delete(pbrid);
        NSOA.meta.log('debug', 'Total: ' + currenttotalpbt);
        NSOA.meta.log('debug', 'Records to remove: ' + JSON.stringify(recordstoremove));
        if(currenttotalpbt !== convertedtotal){
           update_pbr(newr.issExternalID__c , convertedtotal, convertedrate );
           var addedrec = upsert_new_record(pbrid, recordstoremove, convertedtotal, convertedremaining, newr);
           var deleteold = delete_old_records(recordstoremove, newr);
        }
    //}else{
        //return;
    //}
}

function total_pbts(pbr){
    var total = 0;
    var pbt = new NSOA.record.oaProjectBudgetTransaction();
    pbt.project_budget_ruleid  = pbr ;
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetTransaction',
        method : 'equal to',
        fields : 'id, total', 
        attributes : [{name : 'limit', value : '1000'}],
        objects : [pbt]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'PBT results: ' + JSON.stringify(results));
    
    for (var i =0; i< results[0].objects.length; i++){
        total = Number(total) + Number(results[0].objects[i].total);
    }
    NSOA.meta.log('debug', 'Total to return: ' + total);
    return total;
}

function pbts_to_delete(pbr){
    var returnarray = [];
    var json;
    var pbt = new NSOA.record.oaProjectBudgetTransaction();
    pbt.project_budget_ruleid  = pbr ;
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetTransaction',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, total, date, category, project_budget_groupid, currency, productid, project_taskid', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1000'
            }
        ],
        objects : [pbt]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'PBT results: ' + JSON.stringify(results));
    
    for (var i =0; i< results[0].objects.length; i++){
        var thisdate = results[0].objects[i].date;
        var datekey = thisdate.substr(0,7);
        var datesplit = datekey.split("-");
        var datenum = Number(datesplit[0]+datesplit[1]);
        NSOA.meta.log('debug', ' datenum ' + datenum);
		json = {
            id: results[0].objects[i].id,
            date: thisdate,
            category: results[0].objects[i].category,
            total: results[0].objects[i].total,
            pbg: results[0].objects[i].project_budget_groupid,
            currency: results[0].objects[i].currency,
            product: results[0].objects[i].productid,
            task: results[0].objects[i].project_taskid,
            sortkey: datenum
        };
        NSOA.meta.log('debug' , JSON.stringify(json));
        returnarray.push(json);
    }
    returnarray.sort(function (a,b){
       return a.sortkey - b.sortkey;
   });
	return returnarray;
}

function upsert_new_record(pbr, array, newtotal, convertedremaining, newr){
    var today = new Date();
    var lastmonth = new Date();
    lastmonth.setMonth(lastmonth.getMonth() - 1);
    var date_utils = require('date_utils');
    var upsarray = [];
	var todaystring = date_utils.date_to_string(today);
    var lmstring = date_utils.date_to_string(lastmonth);
    var obj = new NSOA.record.oaProjectBudgetTransaction();
	obj.category = array[0].category;
    obj.productid = array[0].product;
    obj.project_taskid = array[0].task;
    obj.project_budget_groupid = array[0].pbg;
    
    obj.quantity = newr.poQuantity__c;
    obj.project_budget_ruleid = pbr;
    if(newr.poActualAmount__c === 0){
        obj.date = array[0].date;
        obj.total = newtotal;
        upsarray.push(obj);
    }
    else{
        NSOA.meta.log('debug', 'Values to add: ' + todaystring + ' ' + convertedremaining);
        obj.date = todaystring;
        obj.total = convertedremaining;
        upsarray.push(obj);
    }
    // Invoke the add call
    var results = NSOA.wsapi.add(upsarray);
    NSOA.meta.log('debug', 'Add Result ' + JSON.stringify(results));
    // Get the new ID
    var id = results[0].id;
    return id;
}

function delete_old_records(array, newr){
    var today = new Date();
    var date_utils = require('date_utils');
	var todaystring = date_utils.date_to_string(today);
    var datekey = todaystring.substr(0,7);
    var datesplit = datekey.split("-");
    var datenum = Number(datesplit[0]+datesplit[1]);
    var deletearray = [];
    
        for(var i = 0 ; i < array.length; i++){
            var actualamount = newr.poActualAmount__c;
            NSOA.meta.log('debug','Actual Amount: ' + actualamount);
            var obj = new NSOA.record.oaProjectBudgetTransaction();
            if(newr.poActualAmount__c === 0 || newr.poActualAmount__c == '0.00'){
                obj.id = array[i].id;
                deletearray.push(obj);
            }else{
        		if(array[i].sortkey >= datenum){
                    obj.id = array[i].id;
                	deletearray.push(obj);
                }else{
                    NSOA.meta.log('debug', 'No need to delete this record...' + JSON.stringify(array[i]));
                }
    		}
        }
    
    // Invoke the delete call
	var results = NSOA.wsapi.delete(deletearray);
}

function flag_for_change(type,oldr,newr){
    var attributes = [{name: "update_custom", value: "1"}];
    if(type === 'new'){
        return;
    }else{
        if(oldr.sendtons__c !== '1'){
            return;
        }else{
            if(oldr.poAmount__c != newr.poAmount__c || oldr.poVendor__c  != newr.poVendor__c  || oldr.issProductforPo__c  != newr.issProductforPo__c || oldr.rechargeableRI__c != newr.rechargeableRI__c || oldr.issCurrencyPicklist__c  != newr.issCurrencyPicklist__c || oldr.itemMemo__c != newr.itemMemo__c){
                var obj = new NSOA.record.oaIssue();
                obj.id = newr.id;
                obj.poAmtChg__c = '1';
                // Invoke the modify call
                var results = NSOA.wsapi.modify(attributes, [obj]);
            }else{
                return;
            }
        }
    }
}

function update_currency(newr, prjcurrency, convertedtotal, convertedactual, total, actual){
   var attributes = [{name: "update_custom", value: "1"}];
   var obj = new NSOA.record.oaIssue();
   obj.id = newr.id;
   obj.poCurrency__c = prjcurrency;
   obj.convertedPOTotal__c = convertedtotal;
   obj.remainingPoAmount__c = Number(total) - Number(actual);
   obj.poConvertedActual__c = convertedactual;
   obj.poConvertedRemaining__c = Number(convertedtotal) - Number(convertedactual);
   // Invoke the modify call
   var results = NSOA.wsapi.modify(attributes, [obj]);

}

function get_exchange_rate(prjcurrency, ricurrency, amount){
    NSOA.meta.log('debug', 'Exchange rate details - Amount: '+ amount + ' Convert from: ' + ricurrency + ' Convert To: ' + prjcurrency);
    var url = String('https://api.exchangerate.host/convert?amount='+amount+'&from='+ricurrency+'&to='+prjcurrency);
    var response = NSOA.https.get({
        url: url  
    });
    NSOA.meta.log('info', 'API Ex Rate Response: '+JSON.stringify(response));
    NSOA.meta.log('info', 'The converted amount: '+response.body.result);
	return response.body.result;
    
}

function update_pbr(pbr, newtotal, newrate){
    var obj = new NSOA.record.oaProjectBudgetRule();
    obj.id = pbr;
    obj.rate = newrate;
    obj.total = newtotal;
    obj.quantity = 0;
    // Not attributes required
    var attributes = [];

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