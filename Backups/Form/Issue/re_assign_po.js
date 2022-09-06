function main(type) {
    //After Save
    var oldr = NSOA.form.getOldRecord();
	var newr = NSOA.form.getNewRecord();
    var issuecat = newr.createdUnassigned__c;
    NSOA.meta.log('debug', 'Issue Cat: ' + issuecat);
    if(issuecat == '1' && oldr.project_task_id != newr.project_task_id){
        update_po(newr, oldr);        
        var pbg = find_open_pbg(newr.project_id);
        var pbr = upsert_new_pbr(newr, pbg);
        var pbt = upsert_new_pbt(pbg, pbr, newr);
        change_cat(newr, pbr);
        delete_old_pbr(oldr);
    }else{
        return;
    }
}

function delete_old_pbr(oldr, newr){
    var pbtdelete = [];
    NSOA.meta.log('debug', 'Old PBR: ' + oldr.issExternalID__c);
    if(oldr.issExternalID__c !== ''){
        var obj = new NSOA.record.oaProjectBudgetRule();
        obj.id = oldr.issExternalID__c;		
        var pbt = new NSOA.record.oaProjectBudgetTransaction();
        pbt.project_budget_ruleid = oldr.issExternalID__c;
        // Define the read request
        var readRequest = {
            type : 'ProjectBudgetTransaction',
            method : 'equal to', 
            fields : 'id', 
            attributes : [{name : 'limit', value : '1000'}],
            objects : [pbt]
        };
        // Invoke the read call
        var pbtresults = NSOA.wsapi.read(readRequest);
        NSOA.meta.log('debug', 'PBT Array: ' + JSON.stringify(pbtresults));
        pbtresults[0].objects.forEach(function (o) {
                var obj = new NSOA.record.oaProjectBudgetTransaction();
				obj.id = o.id;
                pbtdelete.push(obj);
            });
        var pbtdelresults = NSOA.wsapi.delete(pbtdelete);
        NSOA.meta.log('debug', 'PBT Delete Status: ' + JSON.stringify(pbtdelresults));
        var results = NSOA.wsapi.delete([obj]);
        NSOA.meta.log('debug', 'PBR Delete Status: ' + JSON.stringify(results));
    }else{
        return;
    }
    return;
}

function update_po(po, oldr){
	var quickpoarray = [];
    var negPO = new NSOA.record.oaPurchase_item();
    var cat3 = NSOA.record.oaCategory_3(po.issProductforPo__c);
    var productid = cat3.externalid;
    negPO.quickPOExt__c = po.id;
    negPO.quantity = po.poQuantity__c;
    negPO.cost = -Math.abs(Number(po.poRate__c));
    negPO.currency = po.issCurrencyPicklist__c;
    negPO.total = -Math.abs(Number(po.poAmount__c));
    negPO.um = 'each';
    negPO.projectid = po.project_id ;
    negPO.name = po.description;
    negPO.date = po.date;
    negPO.non_po = '1';
    negPO.ignoreForUnassigned__c  = '1';
    negPO.productid = productid;
    negPO.createdUnassigned__c = '1';
    negPO.project_taskid = oldr.project_taskid;
    quickpoarray.push(negPO);
    var posPO = new NSOA.record.oaPurchase_item();
    posPO.quickPOExt__c = po.id + po.project_task_id;
    posPO.project_taskid = po.project_task_id;
    posPO.quantity = po.poQuantity__c;
    posPO.cost = po.poRate__c;
    posPO.currency = po.issCurrencyPicklist__c;
    posPO.total = po.poAmount__c;
    posPO.um = 'each';
    posPO.projectid = po.project_id;
    posPO.name = po.description;
    posPO.date = po.date;
    posPO.non_po = '1';
    posPO.ignoreForUnassigned__c  = '1';
    posPO.productid = productid;
    posPO.createdUnassigned__c = '1';
    quickpoarray.push(posPO);
    // Not attributes required
    var attributes = [{
            name : 'lookup',
            value : 'quickPOExt__c'
        },{name:"update_custom",value:"1"}];

    // Invoke the modify call
    var results = NSOA.wsapi.upsert(attributes, quickpoarray);
    NSOA.meta.log('debug', 'Update result: ' + JSON.stringify(results));
}

function change_cat(po, pbr){
    var attributes = [{name:"update_custom",value:"1"}];
    var obj = new NSOA.record.oaIssue();
	obj.id = po.id;
    obj.issue_category_id =6; //Change to Parameter
    obj.issue_stage_id = 2;
    obj.issExternalID__c = pbr;
    var results = NSOA.wsapi.modify(attributes, [obj]);
    NSOA.meta.log('debug', 'Update result: ' + JSON.stringify(results));
    return;
    
}

function find_open_pbg(project){
    var obj = new NSOA.record.oaProjectBudgetGroup();
	obj.projectid = project;
    obj.approval_status = "O";
    // Define the read request
    var readRequest = {
        type : 'ProjectBudgetGroup',
        method : 'equal to', 
        fields : 'id', 
        attributes : [{name : 'limit', value : '1'}],
        objects : [obj]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', 'Results for PBG Search ' + JSON.stringify(results));
    var id = results[0].objects[0].id;
    return id;

}

function upsert_new_pbr(newr, pbg){
    var attributes = [{
            name : 'lookup',
            value : 'notes'
        },{name:"update_custom",value:"1"}];
    var cat3 = NSOA.record.oaCategory_3(newr.issProductforPo__c);
    var productid = cat3.externalid ;
    var obj = new NSOA.record.oaProjectBudgetRule();
    obj.category = '3';    
	obj.productid  = productid;
    obj.project_budget_groupid = pbg;
    obj.project_taskid = newr.project_task_id;
    obj.notes = newr.issPoNum__c  + newr.itemMemo__c;
    obj.quantity = 0;
    obj.rate = newr.convertedPOTotal__c;
    obj.total = newr.convertedPOTotal__c ;
    // Invoke the modify call
    var results = NSOA.wsapi.add([obj]);
    NSOA.meta.log('debug', 'Results for PBR Add ' + results[0].id);
    return results[0].id;
}

function upsert_new_pbt(pbg, pbr, newr){
    var cat3 = NSOA.record.oaCategory_3(newr.issProductforPo__c);
    var productid = cat3.externalid ;
    var obj = new NSOA.record.oaProjectBudgetTransaction();
	obj.category = '3';
    obj.productid = productid;
    obj.project_taskid = newr.project_task_id;
    obj.project_budget_groupid = pbg;
    obj.total = newr.convertedPOTotal__c;
    obj.quantity = 1;
    obj.project_budget_ruleid = pbr;
    obj.date = newr.date;
    // Invoke the add call
    var results = NSOA.wsapi.add([obj]);
    NSOA.meta.log('debug', 'Results for PBT Add ' + JSON.stringify(results));
    // Get the new ID
    var id = results[0].id;
    return id;
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