function main() {
    var iterator = NSOA.report.data(140);
    var activeso = create_report_array(iterator);
    update_rr(activeso);
    
}

function create_report_array(iterator){
    var json;
    var reportarr = [];
    // get the first record from iterator
    var record = iterator.next();
    var i = 0;
	while(i < iterator.length){
        json = {
            projectid:  record["Project - Internal id"],
            gbpamt: record["Sales Order - Total money (GBP)"],
            usdamt: record["Sales Order - Total money (USD)"],
            prjsub: record["Project - Subsidiary"]
        };
        var checkprj = arrayObjectIndexOf(reportarr, record["Project - Internal id"], "projectid");
        if (checkprj == -1){
            reportarr.push(json);
        }else{
            reportarr[checkprj].gbpamt = Number(reportarr[checkprj].gbpamt) + Number(record["Sales Order - Total money (GBP)"]);
            reportarr[checkprj].usdamt = Number(reportarr[checkprj].usdamt) + Number(record["Sales Order - Total money (USD)"]);
        }      
        record = iterator.next();
        i++;
    }
    NSOA.meta.log('debug', JSON.stringify(reportarr));
    return reportarr;
}

function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

function update_rr(array){
    var attributes = [{name:"update_custom",value:"1"}];
    for(var i =0; i< array.length; i++){
        var modifyarray = [];
        var bivf = get_bivf_id(array[i].projectid);
        NSOA.meta.log('debug', 'BIVF Value:  ' + JSON.stringify(bivf));
        if(bivf !== false){
            var prj = new NSOA.record.oaProject();
            prj.id = array[i].projectid;
            var rr = new NSOA.record.oaRevenue_recognition_rule();
            rr.id = bivf[0].id;
            if(array[i].prjsub == "Squint/Opera Ltd"){
                rr.amount = array[i].gbpamt;
                prj.prjTotCustPo__c = array[i].gbpamt;
            }else{
                rr.amount = array[i].usdamt;
                prj.prjTotCustPo__c = array[i].usdamt;
            }
            modifyarray.push(rr);
            modifyarray.push(prj);
            // Invoke the modify call
			var results = NSOA.wsapi.modify(attributes, modifyarray);
            NSOA.meta.log('debug', 'Update Results:  ' + JSON.stringify(results));
        }

    }
}

function get_bivf_id(project){
    var returnarray = [];
    // Create the issue object
    var obj = new NSOA.record.oaRevenue_recognition_rule();
    obj.projectid = project;
    obj.active = "1";
    obj.type = "B";
    // Define the read request
    var readRequest = {
        type : 'Revenue_recognition_rule',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, extra_data, type', // specify fields to be returned
        attributes : [{name : 'limit', value : '1'}],
        objects : [obj]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    var check = isEmpty(results[0].objects);
    if(check === false){
        var json = {
            id: results[0].objects[0].id,
            purchasetotal: results[0].objects[0].extra_data,
            type: results[0].objects[0].type
        };
        returnarray.push(json);
    }else{
        return false;
    }
    return returnarray;

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