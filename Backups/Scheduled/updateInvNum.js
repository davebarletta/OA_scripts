function main() {
    try{
        var invoiceresults = find_invoices();
        NSOA.meta.log('debug', 'Read Results: ' + JSON.stringify(invoiceresults));
        var invupdresults = update_invoices(invoiceresults);
        NSOA.meta.log('debug', 'Modify Results: ' + JSON.stringify(invupdresults));

       }            
    catch(error){
        NSOA.meta.log('error', error);
    }

}

function find_invoices(){
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var invoice = new NSOA.record.oaInvoice();
    invoice.nsInvoiceNum__c = '';
    invoice.nsInvoiceScriptProcessed__c = '1';
    while (limitReached === false) {

        readRequest[0] = {
            type: "Invoice",
            fields: "id, nsInvoiceNum__c, number",
            method: "not equal to",
            objects: [invoice],
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
                    nsNum: o.nsInvoiceNum__c,
                    oaNum: o.number
                };
                resultsArray_JSON.push(resultsJSON);
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
   
    return resultsArray_JSON;
}

function update_invoices(array){
    if (array === null)
            {
                NSOA.meta.log('info', 'There are no new invoices to update.');
            }
        else if(array !== null){
            NSOA.meta.log('debug', 'Modify process started...');
          var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
            for (var i=0;i<searcharrays.length;i++){
                var objarray = [];
                for (var j=0;j<searcharrays[i].length;j++){
                    var invoicetoupdate = new NSOA.record.oaInvoice();
                    invoicetoupdate.id = searcharrays[i][j].id;
                    invoicetoupdate.number = searcharrays[i][j].nsNum;
                    invoicetoupdate.originalOAnum__c = searcharrays[i][j].oaNum;
                    invoicetoupdate.nsInvoiceScriptProcessed__c = '1';
                    objarray.push(invoicetoupdate);

                }
                NSOA.meta.log('debug', 'Invoice Objarray after for: '+ JSON.stringify(objarray));
                var attributes = [{name:"update_custom",value:"1"}];
                var results = NSOA.wsapi.modify(attributes, objarray);
                 if (!results || !results[0] || !results[0].objects) {
                    // An unexpected error has occurred!
                } else if (results[0].errors !== null && results[0].errors.length > 0) {
                    // There are errors to handle!
                } else {
                   NSOA.meta.log('debug', i+1 + 'array has been processed...');
                }

            }
            NSOA.meta.log('debug', 'There are ' + array.length + ' invoices to update.');
        }
            else{return;}
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