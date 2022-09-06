function main(type) {
    //After Save
    try{
        var newr = NSOA.form.getNewRecord();
        var id = newr.id;
        var cus = newr.customerid;
        var rcid = newr.nsRCid__c;
        var currentcc = newr.cost_centerid;
        NSOA.meta.log('debug' , 'CurrentCC ' + currentcc);
        var modid = new NSOA.record.oaProject();
        modid.id = id;
        if(isEmpty(currentcc) === true || currentcc === 0){
            var ccid = find_cost_center(rcid);
            if(ccid !== false){
                NSOA.meta.log('debug', 'CCID: ' + ccid);
            modid.cost_centerid = ccid;
        }
        }

        modid.internalPrjId__c = id;
        modid.internalCustomerId__c = cus;
        // Invoke the modify call
        var attributes = [{name:"update_custom",value:"1"}];
        var modidresults = NSOA.wsapi.modify(attributes, [modid]);
    }catch(err){
        NSOA.meta.log('error' , err);
    }
}

function find_cost_center(id){
    var cc = new NSOA.record.oaCostcenter();
    cc.nsRevCentreId__c  = id;
    // Define the read request
    var readRequest = {
        type : 'Costcenter',
        method : 'equal to', 
        fields : 'id', 
        attributes : [{name : 'limit', value : '1'}],
        objects : [cc]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    if(!isEmpty(results[0].objects[0].id)){
        NSOA.meta.log('debug', 'Cost Center ID: ' + results[0].objects[0].id);
        return results[0].objects[0].id;
    }else{
        return false;
    }
    

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