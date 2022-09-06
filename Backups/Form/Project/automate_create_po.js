function createCustomerPO(type) {
    //After Save
    var value = NSOA.form.getValue('contractLink__c');
    NSOA.meta.log('debug','Link field format: '+value);
    try {
        var FLD_CUSTPO_NUM = 'prj_custpo_num__c',
            FLD_CUSTPO_AMT = 'prj_custpo_amt__c',
            FLD_CUSTPO_DATE = 'prj_custpo_date__c',
            FLD_CREATE_PO = 'prj_create_po__c';

        // get updated project record fields
        var updPrj = NSOA.form.getNewRecord();

        // if the "Create PO" checkbox is checked and a PO number is entered, create a PO
        if (updPrj[FLD_CREATE_PO] == '1') {
			var latestnum = find_latest_po();
            var nextnum = Number(latestnum) + 1;
            update_latest_po(nextnum);
            var startname = 'SO-';
            var nextstr = nextnum.toString();
            var numlength = nextstr.length;
            var middlestr;
            switch(numlength){
                    case 1:
                            middlestr = '00000';        
                        break;
                    case 2: 
                            middlestr = '0000';                            
                        break;
                    case 3: 
                        middlestr = '000';
                        break;
                    case 4: 
                        middlestr = '00';
                        break;
                    case 5: 
                        middlestr = '0';
                        break;
                    default:
                        middlestr = '000000';

                }
            var poname = startname + middlestr + nextstr;
            var recCustPO = new NSOA.record.oaCustomerpo();
            recCustPO.number = poname;
            recCustPO.name = poname + ' ' + updPrj.name;

            // use the PO date if available, otherwise use project start date
            if (updPrj[FLD_CUSTPO_DATE] != '0000-00-00') {
                recCustPO.date = updPrj[FLD_CUSTPO_DATE];
            } else {
                recCustPO.date = updPrj.start_date;
            }

            // currency custom fields return ISO-#.##; remove the ISO code and dash
            var cleanAmt = updPrj[FLD_CUSTPO_AMT].replace(/-\w{3}/, '');

            // use the PO amt if available, otherwise use project budget
            if (cleanAmt && cleanAmt != '0.00') {
                recCustPO.total = cleanAmt;
            } else if (updPrj.budget && updPrj.budget > 0.00) {
                recCustPO.total = updPrj.budget;
            }
			recCustPO.notes = updPrj.prjSoNotes__c;
            recCustPO.Contract__c = updPrj.prjSoLink__c;
            recCustPO.currency = updPrj.prjBillingCurrency__c;
            recCustPO.customerid = updPrj.customerid;
            recCustPO.netsuite_sales_order_project_id__c = updPrj.netsuite_project_id__c;
            recCustPO.active = 1;

            // disable the current user's filter set while script runs
            NSOA.wsapi.disableFilterSet(true);

            // add the new customer po to the project
            var custPOResults = NSOA.wsapi.add(
                [recCustPO]
            );

            if (!custPOResults || !custPOResults[0]) {
                NSOA.meta.log('error', 'Unexpected error! Customer PO was not created.');
            } else if (custPOResults[0].errors) {
                custPOResults[0].errors.forEach(function(err) {
                    NSOA.meta.log('error', 'Error: ' + err.code + ' - ' + err.comment);
                });
            } else {
                // new customer po to project link object
                var recCustPOtoProj = new NSOA.record.oaCustomerpo_to_project();
                recCustPOtoProj.customerpoid = custPOResults[0].id;
                recCustPOtoProj.customerid = updPrj.customerid;
                recCustPOtoProj.projectid = updPrj.id;
                recCustPOtoProj.active = '1';

                // disable the current user's filter set while script runs
                NSOA.wsapi.disableFilterSet(true);

                // add the new customer po to the project
                var custPOtoProjResults = NSOA.wsapi.add(
                    [recCustPOtoProj]
                );

                if (!custPOtoProjResults || !custPOtoProjResults[0]) {
                    NSOA.meta.log('error',
                        'Unexpected error! Customer PO was not linked to the project.');
                } else if (custPOtoProjResults[0].errors) {
                    custPOtoProjResults[0].errors.forEach(function(err) {
                        NSOA.meta.log('error', 'Error: ' + err.code + ' - ' + err.comment);
                    });
                }

            }

            // create project object to hold update information and clear quick po
            var recProj = new NSOA.record.oaProject(updPrj.id);
            recProj[FLD_CUSTPO_NUM] = '';
            recProj[FLD_CREATE_PO] = '';
            recProj[FLD_CUSTPO_AMT] = '';
            recProj[FLD_CUSTPO_DATE] = '';
            recProj.prjSoNotes__c = '';
            recProj.prjSoLink__c = '';

            // disable the current user's filter set while script runs
            NSOA.wsapi.disableFilterSet(true);

            // enable custom field editing
            var update_custom = {
                name: 'update_custom',
                value: '1'
            };

            // update the project to clear quick customer po create information
            var projResults = NSOA.wsapi.modify(
                [update_custom], [recProj]
            );

            if (!projResults || !projResults[0]) {
                NSOA.meta.log('error', 'Unexpected error! Project was not updated.');
            } else if (projResults[0].errors) {
                projResults[0].errors.forEach(function(err) {
                    NSOA.meta.log('error', 'Error: ' + err.code + ' - ' + err.comment);
                });
            }

        } else {
            NSOA.meta.log('debug', 'Customer po creation was skipped.');
        }

    } catch (e) {
        NSOA.meta.log('error', 'Uncaught error: ' + e);
    }
}

function find_latest_po(){
	var pocounter = new NSOA.record.oaCategory_5();
    pocounter.id = 15; //Need to add as a parameter
    // Define the read request
    var readRequest = {
        type : 'Category_5',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, latestCustPO__c', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [pocounter]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    return results[0].objects[0].latestCustPO__c;

}

function update_latest_po(endnum){
    var update_custom = [{name:"update_custom",value:"1"}];
    var obj = new NSOA.record.oaCategory_5();
    obj.id = 15;
    obj.latestCustPO__c = endnum;
    var results = NSOA.wsapi.modify(update_custom, [obj]);
    return;

}