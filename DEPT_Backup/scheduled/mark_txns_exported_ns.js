///-----------------------------------------------------------------
///   Class:          mark_txns_exported_ns.
///   Description:    Marks Revenue Transactions as "Exported to NetSuite" based on Project Subsidiary and a date filter
///   Author:         Dave Barletta                    Date: Oct 07, 2022
///   Notes:          Meant for Data Cleanup post Data Migration
///   Revision History:
///   Name: Initial          Date: Oct-07-22       Description: Initial Version
///-----------------------------------------------------------------

function main() {
    NSOA.meta.log('info', 'Script started...');
    var filterdate = NSOA.context.getParameter('rev_txn_date');
    var filtersub = NSOA.context.getParameter('projectSubsidiary');
    NSOA.meta.log('debug', 'Filter date: '+ filterdate);
    var revtxns = gather_rev_txns(filterdate, filtersub);
    create_export_ns_record(revtxns);
    update_txns(revtxns);
}

function gather_rev_txns(date, sub){
    NSOA.wsapi.disableFilterSet(true);
	var date_utils = require('date_utils');
	var oadate = new NSOA.record.oaDate();
    oadate.day = date.getDate();
    oadate.month = (date.getMonth() + 1);
    oadate.year = date.getFullYear();
    
    var readRequest = [], resultsJSON, resultsArray_JSON = [];
    var increment = 0, pageSize = 1000, limitReached = false;
    var txn = new NSOA.record.oaRevenue_recognition_transaction();
    while (limitReached === false) {

        readRequest[0] = {
            type: 'Revenue_recognition_transaction',
            fields: 'id, notes, netsuite_revenue_recognition_transaction_id__c, projectid, date',
            method: 'equal to',
            objects: [txn, oadate],
            attributes: [{name: "limit", value: increment + "," + pageSize},
            			 {name: "filter", value: "older-than,not-exported"},
                         {name: "field", value: "date"}]
        };


        var resultsArray = NSOA.wsapi.read(readRequest);
        if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
            // An unexpected error has occurred!
        } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
            // There are errors to handle!
        } else {
            // Process the response as expected
            NSOA.meta.log('debug','Full Revtxn Array: ' + JSON.stringify(resultsArray));
            resultsArray[0].objects.forEach(function (o) {

                var thisprj = NSOA.record.oaProject(o.projectid);
                if(thisprj.netsuite_subsidiary__c == sub){
                    resultsJSON = {
                    id: o.id,
                    notes: o.notes,
                    nsid: o.netsuite_revenue_recognition_transaction_id__c,
                    project: o.projectid,
                    date: o.date
                };
                	resultsArray_JSON.push(resultsJSON);
                }else{
                    NSOA.meta.log('debug', 'Skipping record: ' + o.id);
                }
            });
        }

        if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
        increment += pageSize;
    }
        
	NSOA.wsapi.disableFilterSet(false);
    
    return resultsArray_JSON;
}

function create_export_ns_record(array){
    var today = new Date();
    var date_utils = require('date_utils');
	var todaystring = date_utils.date_to_string(today);
    if (array === null)
            {
                NSOA.meta.log('info', 'There are no transactions to update.');
            }
        else if(array !== null){
            NSOA.meta.log('debug', 'Create process started...');
          var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
            for (var i=0;i<searcharrays.length;i++){
                var objarray = [];
                for (var j=0;j<searcharrays[i].length;j++){
                    var txnexport = new NSOA.record.oaImportExport();
                    txnexport.id = searcharrays[i][j].id;
                    txnexport.application = 'netsuite';
                    txnexport.type = 'Revenue_recognition_transaction';
                    txnexport.exported = todaystring;
                    txnexport.imported = todaystring;
                    objarray.push(txnexport);

                }
                NSOA.meta.log('debug', 'ImportExport Objarray after for: '+ JSON.stringify(objarray));
                var results = NSOA.wsapi.add(objarray);
                 if (!results || !results[0] || !results[0].objects) {
                    // An unexpected error has occurred!
                    
                } else if (results[0].errors !== null && results[0].errors.length > 0) {
                    // There are errors to handle!
                     NSOA.meta.log('debug','Error results: '+JSON.stringify(results));
                } else {
                   NSOA.meta.log('debug', i+1 + 'array has been processed...');
                }

            }
            NSOA.meta.log('debug', 'There were ' + array.length + ' transactions to update.');
        }
            else{return;}
}

function update_txns(array){
    if (array === null)
            {
                NSOA.meta.log('info', 'There are no transactions to update.');
            }
        else if(array !== null){
            NSOA.meta.log('debug', 'Create process started...');
          var searcharrays = splitArrayIntoChunksOfLen(array, 1000);
            for (var i=0;i<searcharrays.length;i++){
                var objarray = [];
                for (var j=0;j<searcharrays[i].length;j++){
                    var txn = new NSOA.record.oaRevenue_recognition_transaction();
                    txn.id = searcharrays[i][j].id;
                    txn.notes = 'Marked Exported to NS by Script';
                    txn.netsuite_revenue_recognition_transaction_id__c = 'N/A';
                    objarray.push(txn);

                }
                NSOA.meta.log('debug', 'Rev TXN Objarray after for: '+ JSON.stringify(objarray));
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
            NSOA.meta.log('debug', 'There were ' + array.length + ' transactions to update.');
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