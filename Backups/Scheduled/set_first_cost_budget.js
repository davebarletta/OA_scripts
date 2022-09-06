function main() {
    var update_custom = [{name:"update_custom",value:"1"}];
    var projs = new NSOA.record.oaProject();
    projs.prjCostBudget__c = 0;
    projs.firstCostBudgetSet__c ='1';
    projs.active = '0';
    // Define the read request
    var projreadRequest = {
        type : 'Project',
        method : 'not equal to', // return only records that match search criteria
        fields : 'id, prjCostBudget__c', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1000'
            }
        ],
        objects : [ // One object with search criteria; type implied by rr type
            projs
        ]
    };
    // Invoke the read call
    var projresults = NSOA.wsapi.read(projreadRequest);
    NSOA.meta.log('debug', JSON.stringify(projresults));
    for(var a=0; a<projresults[0].objects.length; a++){
        try{
            var pbgs = new NSOA.record.oaProjectBudgetGroup();
			pbgs.approval_status = 'O';
            pbgs.projectid = projresults[0].objects[a].id;
            // Define the read request
            var pbgreadRequest = {
                type : 'ProjectBudgetGroup',
                method : 'equal to', // return only records that match search criteria
                fields : 'id, projectid, approval_status', // specify fields to be returned
                attributes : [ // Limit attribute is required; type is Attribute
                    {
                        name : 'limit',
                        value : '1'
                    }
                ],
                objects : [ // One object with search criteria; type implied by rr type
                    pbgs
                ]
            };
            var pbgresults = NSOA.wsapi.read(pbgreadRequest);
    		NSOA.meta.log('debug', JSON.stringify(pbgresults));
            var pbgupd = new NSOA.record.oaProjectBudgetGroup();
            pbgupd.id = pbgresults[0].objects[0].id;
            pbgupd.total_expected_cost = projresults[0].objects[a].prjCostBudget__c;
            var pbgupdresults = NSOA.wsapi.modify(update_custom, [pbgupd]);
            var prjupd = new NSOA.record.oaProject();
            prjupd.id = projresults[0].objects[a].id;
            prjupd.firstCostBudgetSet__c = '1';
            var prjupdresults = NSOA.wsapi.modify(update_custom, [prjupd]);
            
        }catch(error){NSOA.meta.log('debug',error);}
    }
}