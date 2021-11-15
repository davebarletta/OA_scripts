function main() { 
    var datelib = require('date_utils');
    var today = new Date();
    var datestring = datelib.date_to_string(today);
    //Get all Active Projects
    var activeprjs = new NSOA.record.oaProject(); //Create the object to define the search criteria for our read
    activeprjs.active = '1'; 
    // Define the read request
    var readactive = {
        type: 'Project', //SOAP Object to search
        method: 'equal to',  //Whether it is inclusive or exclusive search criteria
        fields: 'id, name, customerid, prjamount__c, currency', //Fields to return in your array
        attributes: [ 
            {
                name: 'limit', //Limit is required
                value: '1000' //how many records to return, maximum allowance is 1000
            }
        ],
        objects: [ 
            activeprjs //add the search criteria variable from above in here
        ]
    };
    // Invoke the read call
    var allactiveprojects = NSOA.wsapi.read(readactive); //Passing the results of your search to a new Array vartiable
    NSOA.meta.log('debug', 'There are '+ allactiveprojects[0].objects.length+ ' active projects.'); //Used to validate that the search worked
    for (var a = 0; a < allactiveprojects[0].objects.length; a++){ //this helps to loop through each record within the Array of results
        try{
            var bramounts = [];
            var rramounts = [];
            calcRuleTotals(allactiveprojects[0].objects[a].id, bramounts, rramounts);
            var brstotal = Number(bramounts.reduce(function(priorvalue, nextvalue){
                    return Number(priorvalue) + Number(nextvalue);
                }, 0));
            var rrrtotal = Number(rramounts.reduce(function(oldvalue, newvalue){
                    return Number(oldvalue) + Number(newvalue);
                }, 0));
            var pbgrecord = new NSOA.record.oaProjectBudgetGroup();
            pbgrecord.projectid =allactiveprojects[0].objects[a].id;
            // Define the read request
            var readpbg = {
                type: 'ProjectBudgetGroup', //SOAP Object to search
                method: 'equal to',  //Whether it is inclusive or exclusive search criteria
                fields: 'id, total_calculated_cost, approval_status', //Fields to return in your array
                attributes: [ 
                    {
                        name: 'limit', //Limit is required
                        value: '1000' //how many records to return, maximum allowance is 1000
                    }
                ],
                objects: [ 
                    pbgrecord //add the search criteria variable from above in here
                ]
            };
            var allpbgs = NSOA.wsapi.read(readpbg); //Passing the results of your search to a new Array variable
            if(allpbgs[0].objects.length !== null){
                NSOA.meta.log('debug', 'For this project: ' + allactiveprojects[0].objects[a].id + ' there are ' + allpbgs[0].objects.length + ' Project Budget Records.');
                var approvalstatusarray = [];
                var costarray=[];
                for(var b=0; b < allpbgs[0].objects.length; b++){
                   approvalstatusarray.push(allpbgs[0].objects[b].approval_status);
                    costarray.push(allpbgs[0].objects[b].total_calculated_cost);
                }
                var approvedbudget = approvalstatusarray.indexOf('A');
                var openbudget = approvalstatusarray.indexOf('O');
                NSOA.meta.log('debug','Approved: '+ approvedbudget+ ' Open: '+ openbudget );
                 NSOA.meta.log('debug',JSON.stringify(costarray));
                var currentprjrev = allactiveprojects[0].objects[a].prjamount__c;
                var targetcost = costarray[approvedbudget];
                var forecastcost = costarray[openbudget];
                if (forecastcost === undefined){
                    forecastcost =0;
                }else{forecastcost=forecastcost;}
                if (targetcost === undefined){
                    targetcost =0;
                }else{targetcost=targetcost;}
                var margin = (currentprjrev - forecastcost)/currentprjrev;
                var variance = targetcost - forecastcost;
                var contribution = currentprjrev - forecastcost;
                if(margin !== margin){
                    margin = 0;
                }else{margin=margin;}
                
                var update_custom = [{
                    name:'update_custom',
                    value:'1'
                }
                ];
                var budgcheck = archive_budget(allactiveprojects[0].objects[a].id, forecastcost, allactiveprojects[0].objects[a].currency, datestring );
                var updateproject = new NSOA.record.oaProject();
                updateproject.id=allactiveprojects[0].objects[a].id;
                updateproject.name=allactiveprojects[0].objects[a].name;
                updateproject.customerid=allactiveprojects[0].objects[a].customerid;
                updateproject.prjTargetCost__c = targetcost;
                updateproject.prjForecastCost__c = forecastcost;
                updateproject.prjVariance__c = variance;
                updateproject.prjMargin__c = margin;
                updateproject.prjContribution__c = contribution;
                updateproject.prjMarginPercent__c = Math.round(margin * 100) + '%';
                updateproject.prjbrtotal__c = brstotal;
                updateproject.prjrrrtotal__c = rrrtotal;
                if(brstotal !== rrrtotal){
                    updateproject.ruleTotalsDiff__c = '1';
                }else{updateproject.ruleTotalsDiff__c = '0';}
                var projectupsert = NSOA.wsapi.modify(update_custom, [updateproject]);
                NSOA.meta.log('debug', JSON.stringify(projectupsert));
                
                NSOA.meta.log('debug', 'Approved: '+ approvedbudget+ ' Open: '+ openbudget+ ' Target: '+targetcost+' Forecast: '+ forecastcost+ ' Revenue: '+ currentprjrev+' Variance: '+ variance+ ' Margin: '+margin+' Contribution: '+contribution + ' BR Total: '+ brstotal+ ' Rev Rules Total: ' + rrrtotal);
                
                
            }else{
                NSOA.meta.log('debug', 'There were no Project Budget records found for project: ' + allactiveprojects[0].objects[a].id);
            }
            
        }catch(error){
            NSOA.meta.log('debug',error);
        }
    }


}

function archive_budget(project,forecast,currency,date){
    var currentbudget = new NSOA.record.oaBudget();
    currentbudget.projectid = project;
    currentbudget.budgetcategory_id = 7;
    // Define the read request
    var readRequest = {
        type : 'Budget',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, total', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [ // One object with search criteria; type implied by rr type
            currentbudget
        ]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    var currentbudgetid = results[0].objects[0].id;
    var currentbudgettotal = results[0].objects[0].total;
    
    if(currentbudgettotal !== forecast){
        var modifybudget = new NSOA.record.oaBudget();
        modifybudget.id = currentbudgetid;
        modifybudget.budgetcategory_id = 6;
        modifybudget.total = 0;
        var attributes = [];

        // Invoke the modify call
        var modresults = NSOA.wsapi.modify(attributes, [modifybudget]);
        // Define a category object to create in OpenAir
        var newbudget = new NSOA.record.oaCategory();
        newbudget.name = 'Forecast Cost from Project Budget';
        newbudget.description = 'Forecast Cost from Project Budget';
        newbudget.currency = currency;
        newbudget.total = forecast;
        newbudget.date = date;
        
    }else{return;}

	return;
}


function calcRuleTotals(currentproj, currentbrtotal, currentrrtotal) {
    var projectbillingrules = new NSOA.record.oaProjectbillingrule();
    projectbillingrules.projectid = currentproj;
    projectbillingrules.type = 'F';
    // Define the read request
    var readbrs = {
        type: 'Projectbillingrule', //SOAP Object to search
        method: 'equal to', //Whether it is inclusive or exclusive search criteria
        fields: 'id, amount, type', //Fields to return in your array
        attributes: [{
            name: 'limit', //Limit is required
            value: '1000' //how many records to return, maximum allowance is 1000
        }],
        objects: [
            projectbillingrules //add the search criteria variable from above in here
        ]
    };
    var allbrs = NSOA.wsapi.read(readbrs); //Passing the results of your search to a new Array variable
    NSOA.meta.log('debug', 'Project Billing Rules: ' + JSON.stringify(allbrs));
    var projectrevrules = new NSOA.record.oaRevenue_recognition_rule();
    projectrevrules.projectid = currentproj;
    // Define the read request
    var readrrrs = {
        type: 'Revenue_recognition_rule', //SOAP Object to search
        method: 'equal to', //Whether it is inclusive or exclusive search criteria
        fields: 'id, amount, type', //Fields to return in your array
        attributes: [{
            name: 'limit', //Limit is required
            value: '1000' //how many records to return, maximum allowance is 1000
        }],
        objects: [
            projectrevrules //add the search criteria variable from above in here
        ]
    };
    var allrrrs = NSOA.wsapi.read(readrrrs); //Passing the results of your search to a new Array variable
    NSOA.meta.log('debug', 'Project Revenue Rules: ' + JSON.stringify(allrrrs));

    for (var ai = 0; ai < allbrs[0].objects.length; ai++) {
        currentbrtotal.push(allbrs[0].objects[ai].amount);
    }
    for (var bi = 0; bi<allrrrs[0].objects.length;bi++){
        currentrrtotal.push(allrrrs[0].objects[bi].amount);
    }
}

function add(accumulator, a) {
    return accumulator + a;
}