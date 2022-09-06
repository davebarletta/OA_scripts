function main(type) {
    //After Save
    var newr = NSOA.form.getNewRecord();
    var currentuser = NSOA.wsapi.whoami();
    var userid = currentuser.id;
    NSOA.meta.log('debug', 'Current user: ' + userid);
	var id = newr.id;
    var generatepos = newr.generateBudgetPOs__c;
    if(generatepos === '1'){
        var openbudget = find_open_budget(id);
        NSOA.meta.log('debug', 'The open budget is ' + openbudget);
        var porules = get_po_rules(openbudget);
        NSOA.meta.log('debug', 'The POs to process: ' + JSON.stringify(porules));
        if(porules.length !== 0){
            var ponum = find_latest_po();
            NSOA.meta.log('debug', 'The next PO Number = ' + Number(Number(ponum)+1));
            var afterpos = assign_po_numbers(porules, ponum, userid);
            update_porules(afterpos);
            update_this_project(id);
        }
        NSOA.meta.log('debug', 'Remaining Units after create/update: ' + NSOA.context.remainingUnits());
    }
}

function find_open_budget(project){
    // Create the issue object
    var budget = new NSOA.record.oaProjectBudgetGroup();
    budget.projectid = project;
    budget.approval_status = "O";
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetGroup',
        method : 'equal to', 
        fields : 'id',
        attributes : [{name : 'limit', value : '1'}],
        objects : [budget]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
	return results[0].objects[0].id;
}

function update_this_project(project){
    var update_custom = [{name:"update_custom",value:"1"}];
    var obj = new NSOA.record.oaProject();
	obj.id = project;
    obj.generateBudgetPOs__c = "0";
    var results = NSOA.wsapi.modify(update_custom, [obj]);
	return;
}

function get_po_rules(budget) {
    var returnarray =[];
    var returnjson;
    var rule = new NSOA.record.oaProjectBudgetRule();
	rule.project_budget_groupid = budget;
    rule.category = 3;
    var readRequest = {
        type: 'ProjectBudgetRule',
        method: 'equal to',
        fields: 'id, quantity, rate, total, notes, projectid, productid, project_taskid',
        attributes: [ {name: 'limit', value: '1000'} ],
        objects: [rule],
    };
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'Retrieved Rules: ' + results[0].objects.length);
    results[0].objects.forEach(function (o) {
        if(isEmpty(o.notes)){
            var qty = find_pbtqty(o.id);
            returnjson = {
                id: o.id,
                project: o.projectid,
                vendor: o.productid,
                quantity: qty,
                rate: o.rate,
                total: o.total,
                notes: o.notes,
                task: o.project_taskid,
                ponum: ''
            };
            returnarray.push(returnjson);
            
        }else{
            NSOA.meta.log('debug','The record was previously processed');
        }
    });
    return returnarray;
}

function find_latest_po(){
	var pocounter = new NSOA.record.oaCategory_5();
    pocounter.id = 15; //Need to add as a parameter
    // Define the read request
    var readRequest = {
        type : 'Category_5',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, nextPoNum__c', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [pocounter]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    return results[0].objects[0].nextPoNum__c;

}

function assign_po_numbers(array, startingnum, userid){
    var date_utils = require('date_utils');
	var attributes = [{
                name : 'lookup',
                value : 'issExternalID__c'
            },{name:"update_custom",value:"1"}];
    var ponum = Number(Number(startingnum) + 1);
    var endingnum = Number(ponum) + Number(array.length);
    NSOA.meta.log('debug', 'Ending Number: ' + endingnum);
    var budgetjson;
    var returnarray = [];
    var objarray =[];
    for(var i =0; i< array.length; i++){
        var remunits = NSOA.context.remainingUnits();
        if(remunits > 550){
            var today = new Date();
            var todaystring = date_utils.date_to_string(today);
            var pbttotal = total_pbts(array[i].id);
            var concatstring ='';
            var obj = new NSOA.record.oaIssue();
            obj.poAmount__c = pbttotal;
            obj.poNumAmount__c  = pbttotal;
            obj.convertedPOTotal__c = pbttotal;
            obj.poQuantity__c = array[i].quantity;
            obj.poRate__c = array[i].rate;
            obj.date = todaystring;
            obj.poConvertedRemaining__c = pbttotal;
            obj.remainingPoAmount__c = pbttotal;
            obj.issPoNum__c ='PO-' +  Number(Number(ponum) + i);
            array[i].ponum = 'PO-' + Number(Number(ponum) + i);
            obj.issue_category_id = 6; //Change to Parameter later
            obj.poTaskId__c = array[i].task;
            obj.project_id = array[i].project;
            obj.project_task_id = array[i].task;
            obj.issExternalID__c = array[i].id;
            obj.issue_stage_id = 1;
            var task = NSOA.record.oaProjecttask(array[i].task);
            var taskname = task.name;
            obj.owner_id = userid;
			var project = NSOA.record.oaProject(array[i].project);
            var prjcurrency = project.currency;
            obj.poCurrency__c = prjcurrency;
            var vendorid = find_vendor_id(array[i].vendor);
            if(vendorid===false){
                var product = find_product_id(array[i].vendor);
                obj.issProductforPo__c = product;
                var prd = NSOA.record.oaCategory_3(product);
                var prdname = prd.name;
                concatstring = prdname;
            }else{
                obj.poVendor__c = vendorid;
                var vend = NSOA.record.oaVendor(vendorid);
                var vendname = vend.name;
                var venddefct = vend.supplierDefCost__c;
                obj.issProductforPo__c = venddefct;
                concatstring = vendname;

            }
            obj.description = 'PO for ' + concatstring + ' on ' + taskname;
            obj.itemMemo__c = concatstring + ' on ' + taskname;
            // Invoke the add call
            var results = NSOA.wsapi.upsert(attributes, [obj]);
            budgetjson = {
                id: array[i].id,
                ponum: 'PO-' + Number(Number(ponum) + i)
            };
            returnarray.push(budgetjson);
            NSOA.meta.log('debug', JSON.stringify(results));
        }else{
            NSOA.form.warning('Due to scripting limitations, there are still a few unprocessed POs from your budget that need to be generated.');
            break;}

    }
    update_latest_po(Number(Number(ponum) + i));
    return returnarray;    
}

function update_porules(array){
    var update_custom = [{name:"update_custom",value:"1"}];
    var updarray = [];
    for(var i = 0; i< array.length; i++){
    	var obj = new NSOA.record.oaProjectBudgetRule();
        obj.id = array[i].id;
        obj.notes= array[i].ponum;
        updarray.push(obj);
    }
    var results = NSOA.wsapi.modify(update_custom, updarray);
	return;
}
                  
function find_vendor_id(product){
    /*var obj = new NSOA.record.oaVendor();
	obj.nominalCodeId__c = product;
    var readRequest = {
        type : 'Vendor',
        method : 'equal to', // return only records that match search criteria
        fields : 'id', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [obj]
    };
    // Invoke the read call*/
    try{
        //var results = NSOA.wsapi.read(readRequest);
        //return results[0].objects[0].id;
        var prd = NSOA.record.oaProduct(product);
        if(!isEmpty(prd.nominalCodeVendor__c)){
            NSOA.meta.log('debug', 'Vendor ID:' + prd.nominalCodeVendor__c);
            return prd.nominalCodeVendor__c;
        }else{
            NSOA.meta.log('debug', 'This should return false, but Vendor ID for a check:' + prd.nominalCodeVendor__c);
            return false;
        }
    }catch (e){
        NSOA.meta.log('error', e);
        return false;
    }

    
}

function find_pbtqty(pbr){
    var qty = 0;
    var pbt = new NSOA.record.oaProjectBudgetTransaction();
    pbt.project_budget_ruleid  = pbr ;
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetTransaction',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, quantity', // specify fields to be returned
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
        qty = Number(qty) + Number(results[0].objects[i].quantity);
    }
    NSOA.meta.log('debug', 'Quantity to return: ' + qty);
    return qty;
}

function find_product_id(product){
	var obj = NSOA.record.oaProduct(product);
    NSOA.meta.log('debug', 'Product ID Found: ' + obj.catthreeid__c);
	return obj.catthreeid__c;
    /*try{
        var results = NSOA.wsapi.read(readRequest);
        return results[0].objects[0].id;
    }catch (e){
        NSOA.meta.log('error', e);
        return false;
    }*/    
}

function update_latest_po(endnum){
    var update_custom = [{name:"update_custom",value:"1"}];
    var obj = new NSOA.record.oaCategory_5();
    obj.id = 15;
    obj.nextPoNum__c = endnum;
    var results = NSOA.wsapi.modify(update_custom, [obj]);
    return;

}

function total_pbts(pbr){
    var total = 0;
    var pbt = new NSOA.record.oaProjectBudgetTransaction();
    pbt.project_budget_ruleid  = pbr ;
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetTransaction',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, total', // specify fields to be returned
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
        total = Number(total) + Number(results[0].objects[i].total);
    }
    NSOA.meta.log('debug', 'Total to return: ' + total);
    return total;
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