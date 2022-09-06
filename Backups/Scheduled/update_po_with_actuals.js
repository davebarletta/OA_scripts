function main() {
    var pos = find_pos();
    update_issues(pos);
 }
 //test
 function find_pos(){
     var poupds = [];
     var objsforupd = [];
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
     NSOA.meta.log('debug', 'Get recent POs started...');
     var readRequest = [], resultsJSON, resultsArray_JSON = [];
     var increment = 0, pageSize = 1000, limitReached = false;
     var pocriteria = new NSOA.record.oaPurchaseorder();
     while (limitReached === false) {
 
             readRequest[0] = {
                 type: "Purchaseorder",
                 fields: "id, poRefNum__c, total",
                 method: "equal to",
                 objects: [pocriteria, datenewer],
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
                         externalid: o.poRefNum__c,                        
                         total: o.total                        
                     };
                     var string = String(o.poRefNum__c);
                     var substring = "ERROR";
                     if(string.indexOf(substring) !== -1){
                         NSOA.meta.log('debug', 'Not processing this PO... no ref num');
                     }else{
                         poupds.push(resultsJSON);
                     }
                     NSOA.meta.log('debug', JSON.stringify(poupds));
                 });
             }
 
             if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
             increment += pageSize;
         }
 
     return poupds;
 }
 
 function update_issues(array){
     var attributes = [{
             name : 'lookup',
             value : 'issPoNum__c'
         },{name:"update_custom",value:"1"}];
     var addarray = [];
     for(var i =0; i<array.length; i++){
         var poarray = look_for_PO(array[i].externalid, array[i].id);
         var obj = new NSOA.record.oaIssue();
         obj.issPoNum__c = array[i].externalid;
         obj.poActualAmount__c = poarray[0].currentactualbalance;
         obj.remainingPoAmount__c = poarray[0].remainingbalance;
         obj.poConvertedActual__c = poarray[0].convertedactual;
         obj.poConvertedRemaining__c  = poarray[0].convertedremaining;
         if(poarray[0].remainingbalance === 0){
             obj.issue_stage_id =2;
         }
         addarray.push(obj);
     }
     // Invoke the add call
     var results = NSOA.wsapi.upsert(attributes, addarray);
     NSOA.meta.log('debug', 'Upsert Results: ' + JSON.stringify(results));
 
 }
 
 function look_for_PO(po, poid){
     var returnarray = [];
     var returnjson;
     var date_utils = require('date_utils');
     
     // Create the issue object
     var issue = new NSOA.record.oaIssue();
     issue.issPoNum__c = po;
     // Define the read request
     var readRequest = {
         type : 'Issue',
         method : 'equal to',
         fields : 'id, poNumAmount__c, issPoNum__c, project_id, issCurrencyPicklist__c, date',
         attributes : [{name : 'limit', value : '1'}],
         objects : [issue]
     };
     // Invoke the read call
     var results = NSOA.wsapi.read(readRequest);
     if(isEmpty(results[0].objects)){
         return false;
     }else{
         var value = date_utils.date_to_string(results[0].objects[0].date);
         var forexdate = date_utils.date_to_forex_date(value);    
         var totalsum = find_total_actual(po);
         var project = NSOA.record.oaProject(results[0].objects[0].project_id);
         var prjcurrency = project.currency;
         var piexrate = get_po_erate(poid);
         var convertedactual = Number(totalsum) * Number(piexrate);
         NSOA.meta.log('debug', 'Converted Actual Amount: ' + convertedactual);
         var convertedopen = get_exchange_rate(prjcurrency, results[0].objects[0].issCurrencyPicklist__c, results[0].objects[0].poNumAmount__c, forexdate);
         returnjson = {
             currentopenbalance: results[0].objects[0].poNumAmount__c,
             currentactualbalance: totalsum,
             remainingbalance: Number(results[0].objects[0].poNumAmount__c) - Number(totalsum),
             refnum: results[0].objects[0].issPoNum__c,
             convertedactual: convertedactual,
             convertedremaining: Number(convertedopen) - Number(convertedactual)
         };
         returnarray.push(returnjson);
     }
     return returnarray;
     
 }
 
 function find_total_actual(poref){
     var currenttotal = 0;
     var poupds = [];
     var readRequest = [], resultsJSON, resultsArray_JSON = [];
     var increment = 0, pageSize = 1000, limitReached = false;
     var pocriteria = new NSOA.record.oaPurchaseorder();
     pocriteria.poRefNum__c = poref;
     while (limitReached === false) {
 
             readRequest[0] = {
                 type: "Purchaseorder",
                 fields: "id, total",
                 method: "equal to",
                 objects: [pocriteria],
                 attributes: [{
                     name: "limit",
                     value: increment + "," + pageSize
                 }]
             };
 
 
             var resultsArray = NSOA.wsapi.read(readRequest);
 
             if (!resultsArray || !resultsArray[0] || !resultsArray[0].objects) {
                 // An unexpected error has occurred!
                 return 0;
             } else if (resultsArray[0].errors !== null && resultsArray[0].errors.length > 0) {
                 // There are errors to handle!
             } else {
                 // Process the response as expected
 
                 resultsArray[0].objects.forEach(function (o) {
                     // Invoke the read call
                     resultsJSON = {
                         id: o.id,
                         total: o.total
                         
                     };
                     currenttotal = Number(currenttotal) + Number(o.total);
                     poupds.push(resultsJSON);
                     NSOA.meta.log('debug', JSON.stringify(poupds));
                 });
             }
 
             if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
             increment += pageSize;
         }
     return currenttotal;
 }
 
 function get_exchange_rate(prjcurrency, ricurrency, amount, date){
     NSOA.meta.log('debug', 'Exchange rate details - Amount: '+ amount + ' Convert from: ' + ricurrency + ' Convert To: ' + prjcurrency + 'Date: ' + date);
     var url = String('https://api.exchangerate.host/convert?amount='+amount+'&from='+ricurrency+'&to='+prjcurrency+'&date='+date);
     var response = NSOA.https.get({
         url: url  
     });
     NSOA.meta.log('info', 'API Ex Rate Response: '+JSON.stringify(response));
     NSOA.meta.log('info', 'The converted amount: '+response.body.result);
     return response.body.result;
     
 }
 
 function get_po_erate(po){
     var obj = new NSOA.record.oaPurchase_item();
     obj.purchaseorderid = po;
     // Define the read request
     var readRequest = {
         type : 'Purchase_item',
         method : 'equal to', // return only records that match search criteria
         fields : 'id, nsExcRate__c', // specify fields to be returned
         attributes : [ // Limit attribute is required; type is Attribute
             {
                 name : 'limit',
                 value : '1'
             }
         ],
         objects : [ // One object with search criteria; type implied by rr type
             obj
         ]
     };
     // Invoke the read call
     var results = NSOA.wsapi.read(readRequest);
     return results[0].objects[0].nsExcRate__c;
 
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