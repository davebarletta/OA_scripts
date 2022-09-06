function main() {
    var pos = find_pos();
     create_issues(pos);
 }
 
 function find_pos(){
     var poupds = [];
     var objsforupd = [];
     var today = new Date(); //Variable created to capture today's date for future calculation
     var minutesprior = 35;
     var minutespriorvalue = new Date(today.getTime() - (minutesprior * 60 * 1000));
     var datenewer = new NSOA.record.oaDate();
     datenewer.day = minutespriorvalue.getDate();
     datenewer.month = (minutespriorvalue.getMonth()+1);
     datenewer.year = minutespriorvalue.getFullYear();
     datenewer.hour= minutespriorvalue.getHours();
     datenewer.second = minutespriorvalue.getSeconds();
     datenewer.minute = minutespriorvalue.getMinutes();
     NSOA.meta.log('debug', 'Get recent POs started..');
     var readRequest = [], resultsJSON, resultsArray_JSON = [];
     var increment = 0, pageSize = 1000, limitReached = false;
     var pocriteria = new NSOA.record.oaPurchase_item();
     pocriteria.netsuite_request_item_id__c = "";
     pocriteria.ignoreForUnassigned__c = "1";
     var notask = new NSOA.record.oaPurchase_item();
     notask.project_taskid ="";
     while (limitReached === false) {
 
             readRequest[0] = {
                 type: "Purchase_item",
                 fields: "id, productid, projectid, project_taskid, total, vendorid, quantity, cost, purchaseorderid, currency, date, name, rebillablePurchase__c",
                 method: "not equal to, equal to",
                 objects: [pocriteria, notask, datenewer],
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
                         externalid: o.id,
                         date: o.date,
                         total: o.total,
                         itemdescription: o.name,
                         productid: o.productid,
                         projectid: o.projectid,
                         taskid: o.project_taskid,
                         quantity: o.quantity,
                         cost: o.cost,
                         currency: o.currency,
                         customer: o.customerid,
                         vendor: o.vendorid,
                         rechargeable: o.rebillablePurchase__c ,
                         mergekey: o.projectid+o.project_taskid,
                         poid: o.purchaseorderid
                     };
                     poupds.push(resultsJSON);
                     NSOA.meta.log('debug', JSON.stringify(poupds));
                 });
             }
 
             if (isEmpty(resultsArray[0].objects) || resultsArray[0].objects.length < pageSize) limitReached = true;
             increment += pageSize;
         }
 
     return poupds;
 }
 
 function create_issues(array){
     var attributes = [{
             name : 'lookup',
             value : 'unassignedExtId__c'
         },{name:"update_custom",value:"1"}];
     var addarray = [];
     for(var i =0; i<array.length; i++){
         var po= NSOA.record.oaPurchaseorder(array[i].poid);
         var poname = po.name;
         var project = NSOA.record.oaProject(array[i].projectid);
         var prjcurrency = project.currency;
         var pm = project.userid;
         var cat3 = find_cat3id(array[i].productid);
         var convertedamount = get_exchange_rate(prjcurrency, array[i].currency, array[i].total);
         var obj = new NSOA.record.oaIssue();
         obj.unassignedExtId__c  = array[i].externalid;
         obj.description = poname;
         obj.issPoNum__c = poname;
         obj.itemMemo__c = array[i].itemdescription;
         obj.poVendor__c = array[i].vendor;
         obj.poRate__c  = array[i].cost;
         obj.date = array[i].date;
         obj.poConvertedActual__c = convertedamount;
         obj.poActualAmount__c = array[i].total;
         obj.convertedPOTotal__c = convertedamount;
         obj.poQuantity__c = array[i].quantity;
         obj.poNumAmount__c  = array[i].total;
         obj.project_id = array[i].projectid;
         obj.issProductforPo__c = cat3;
         obj.issue_category_id = 9;
         obj.owner_id = pm;
         obj.rechargeableRI__c = array[i].rechargeable;
         obj.issue_stage_id = 4;
         obj.poAmount__c = array[i].total;
         obj.poCurrency__c = array[i].currency;
         obj.issCurrencyPicklist__c = array[i].currency;
         obj.createdUnassigned__c = '1';
         addarray.push(obj);
     }
     // Invoke the add call
     var results = NSOA.wsapi.upsert(attributes, addarray);
     NSOA.meta.log('debug', 'Upsert Results: ' + JSON.stringify(results));
 
 }
 
 function find_cat3id(product){
     var cat3 = new NSOA.record.oaCategory_3();
     cat3.externalid = product;
     // Define the read request
     var readRequest = {
         type : 'Category_3',
         method : 'equal to', 
         fields : 'id', 
         attributes : [{name : 'limit', value : '1'}],
         objects : [cat3]
     };
     // Invoke the read call
     var results = NSOA.wsapi.read(readRequest);
     return results[0].objects[0].id;
     
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