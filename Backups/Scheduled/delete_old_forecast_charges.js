function main() {
    var slipstodelete = get_slips();
    delete_charges(slipstodelete);
}

function get_slips(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var slip_conditions = new NSOA.record.oaSlip(); //Update after record to the SOAP object name example 'oaProject'
    slip_conditions.slip_stageid = 11; //Change this to the criteria to delete. If using a custom checkbox, True equals '1' with the quotes included.   

    while (limitReached === false) {

        readRequest[0] = {
            type: "Slip", //Update here to the SOAP table to delete minus the 'oa'
            fields: "id",
            method: "equal to",
            objects: [slip_conditions],
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
                    id: o.id
                };
                resultsArray_JSON.push(resultsJSON);
            });

        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function delete_charges(array){
    NSOA.meta.log('debug', 'Modify process started...');
	var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
    for (var i=0;i<searcharrays.length;i++){
        var objarray = [];
        for (var j=0;j<searcharrays[i].length;j++){
            var newslip = new NSOA.record.oaSlip();
    		newslip.id = searcharrays[i][j].id;
            objarray.push(newslip);

        }
		var results = NSOA.wsapi.delete(objarray);
         if (!results || !results[0] || !results[0].objects) {
            // An unexpected error has occurred!
        } else if (results[0].errors !== null && results[0].errors.length > 0) {
            // There are errors to handle!
        } else {
           
        }
        NSOA.meta.log('debug', i+1 + 'array has been processed...');

    }
}

function splitArrayIntoChunksOfLen(arr, len) {
  var chunks = [], i = 0, n = arr.length;
  while (i < n) {
    chunks.push(arr.slice(i, i += len));
  }
  return chunks;
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