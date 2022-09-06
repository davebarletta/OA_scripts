function main() {
    var attributes = [
        {
            name:"update_custom",
            value:"1"
        }
    ]; 	
    // Define the read request
    var vendor = new NSOA.record.oaVendor();
    vendor.vendorSplitOut__c = 1;
    vendor.nominalCodeCreated__c = '';
    var vendorRequest ={
        type:"Vendor",
        method:"equal to", 
        fields:"id,name,netsuite_vendor_id__c, supplierCategory__c",
        attributes:[
            {
                name:"limit",
                value:"1000"
            }
        ],
        objects:[vendor] 
    };
    var vendorResults = NSOA.wsapi.read(vendorRequest);
    //Validate that the Query returned results
    if (vendorResults[0].objects !== null){
        //Log the number of records returned
        NSOA.meta.log("info","Vendors Found: " + vendorResults[0].objects.length);
        //Loop through the results to create a new Nominal Code for each Vendor
        for(var i = 0 ; i < vendorResults[0].objects.length ; i++){
            var nominalCode = new NSOA.record.oaProduct();
            nominalCode.name = vendorResults[0].objects[i].name;
            nominalCode.nominalCodeVendor__c = vendorResults[0].objects[i].id;
            nominalCode.nsVendorId__c = vendorResults[0].objects[i].id;
            nominalCode.active = 1;
            nominalCode.um="each";
            var addNominalCode = NSOA.wsapi.add([nominalCode]);
            var newId = addNominalCode[0].id;
            NSOA.meta.log("info","New Nominal Code Created. ID = " + newId);
            //var cat3 = new NSOA.record.oaCategory_3();
            //cat3.name = vendorResults[0].objects[i].name;
            //cat3.nsVendorIdCat3__c = vendorResults[0].objects[i].netsuite_vendor_id__c;
            //cat3.externalid = newId;
            //cat3.active = '1';
            //var addCat3 = NSOA.wsapi.add([cat3]);
            //var cat3Id = addCat3[0].id;
            var generic = new NSOA.record.oaUser();
            generic.active = '1';
            generic.isFreelancer__c = '1';
            generic.generic = '1';
            generic.nickname = vendorResults[0].objects[i].name;
            generic.name = vendorResults[0].objects[i].name;
            generic.addr_last = vendorResults[0].objects[i].name;
            if(vendorResults[0].objects[i].supplierCategory__c == 'Freelancer'){
            	generic.job_codeid = 101; //Freelancer jobcode
            }else if(vendorResults[0].objects[i].supplierCategory__c == 'Subcontractor'){
                generic.job_codeid = 112; //Subcontractor jobcode
            }
            var addgeneric = NSOA.wsapi.add([generic]);
            var genericId = addgeneric[0].id;
            //update vendor with details, and to remove from future script runs                       
            if(newId !== null){
                var updateVendor = new NSOA.record.oaVendor();
                updateVendor.id =vendorResults[0].objects[i].id;
                updateVendor.nominalCodeCreated__c = 1;
                updateVendor.nominalCodeId__c = newId;
				//updateVendor.cat3Value__c = cat3Id;
                updateVendor.oaGenericId__c = genericId;
                var vendorUpdateResult = NSOA.wsapi.modify(attributes, [updateVendor]);
                NSOA.meta.log("info","The vendor "+ vendorResults[0].objects[i].name + " was succesfully updated!" );
                
            }else{NSOA.meta.log("info","There was a problem creating the Nominal Code for the vendor named: "+ vendorResults[0].objects[i].name);}
        }
        try{
            
        }catch (error){
            NSOA.meta.log('error',error);
        }
    }else{NSOA.meta.log("info", "No New Vendors Found.");}
    var updates = find_recently_updated();
    NSOA.meta.log('debug', 'Updates: ' + JSON.stringify(updates));
    update_vendor(updates);
}

function find_recently_updated(){
    var today = new Date(); //Variable created to capture today's date for future calculation
    var minutesprior = 30;
    var minutespriorvalue = new Date(today.getTime() - (minutesprior * 60 * 1000));
    var datenewer = new NSOA.record.oaDate();
    datenewer.day = minutespriorvalue.getDate();
    datenewer.month = (minutespriorvalue.getMonth()+1);
    datenewer.year = minutespriorvalue.getFullYear();
    datenewer.hour= minutespriorvalue.getHours();
    datenewer.second = minutespriorvalue.getSeconds();
    datenewer.minute = minutespriorvalue.getMinutes();
    NSOA.meta.log('debug', 'Getting recently updated vendors...');
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var vendcriteria = new NSOA.record.oaVendor();
    while (limitReached === false) {

            readRequest[0] = {
                type: "Vendor",
                fields: "id, name, oaGenericId__c",
                method: "equal to",
                objects: [vendcriteria, datenewer],
                attributes: [{
                    name: "limit",
                    value: increment + "," + pageSize
                },{
                    name : 'filter',
                    value : 'newer-than'
                },
                {
                    name : 'field',
                    value : 'updated'
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
                        name: o.name ,
                        oageneric: o.oaGenericId__c
                    };
                    resultsArray_JSON.push(resultsJSON);
                });
            }

            if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
            increment += pageSize;
        }

    return resultsArray_JSON;
}

function update_vendor(array){
    var attributes = [{name:"update_custom",value:"1"}];
    var update_array = [];
    for(var i =0; i< array.length; i++){
		var obj = new NSOA.record.oaUser();
        obj.id = array[i].oageneric;
        obj.nickname = array[i].name;
        obj.name = array[i].name;
        update_array.push(obj);
    }
    // Invoke the modify call
	var results = NSOA.wsapi.modify(attributes, update_array);
    NSOA.meta.log('debug', 'Generic Update:  ' + JSON.stringify(results));
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