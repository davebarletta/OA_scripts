function main(type) {
    //After Save
    //Get Variables for script
    var newr = NSOA.form.getNewRecord();
	var currentphase = newr.id;
    var currentname = newr.name;
    var copytoprj = newr.copyToPrj__c;
    var splitcusprj =copytoprj.split(':');
    var prj = splitcusprj[1];
    NSOA.meta.log('debug', 'Copy to PRJ: '+ copytoprj+ ' Splitcusprj: '+ JSON.stringify(splitcusprj) + ' Prj: '+ prj);
    var copybudg = newr.copyBudget__c;
    var classification = newr.classification;
    var id_num = newr.id_number;
    NSOA.meta.log('debug', 'ID num: '+ id_num);
    if(classification == 'P'){
        if(copytoprj !== null || copytoprj !== '' && copybudg === true){
            NSOA.meta.log('debug', 'You\'re in Luck!');
            var createdid = check_for_phase(currentname,id_num, prj);
            NSOA.meta.log('debug','The record you are looking for: '+ createdid);
            var queuerecord = create_queue_record(currentphase,createdid,prj);
            var reset = reset_record(currentphase);
           //NSOA.form.confirmation('Your budget copy is queued up. It will be completed soon.');
        }else{
            NSOA.meta.log('debug', 'Nothing to do here...');
            return;
        }
    }else{return;}
}

function check_for_phase(name,idnum, prj){
    var task = new NSOA.record.oaProjecttask();
    task.projectid = prj;
    //task.id_number = idnum;
    task.name = name;
    // Define the read request
    var readRequest = {
        type : 'Projecttask',
        method : 'equal to', // return only records that match search criteria
        fields : 'id', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [ // One object with search criteria; type implied by rr type
            task
        ]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
    NSOA.meta.log('debug', JSON.stringify(results));
    var id = results[0].objects[0].id;
    return id;
}

function create_queue_record(copyfrom,copyto,project){
    var copy_queue = NSOA.context.getParameter('copy_queue_id');
    var datelib = require('date_utils');
    var today = new Date();
    var datestring = datelib.date_to_string(today);
    // Define a category object to create in OpenAir
    var budget = new NSOA.record.oaIssue();
    budget.owner_id = 1;
    budget.description = 'Waiting to copy ' + copyfrom;
    budget.copyFrom__c = copyfrom;
    budget.copyTo__c = copyto;
    budget.project_id = project;
    budget.issue_category_id = copy_queue;
    budget.date = datestring;
    budget.issue_stage_id = 1;
    budget.owner_id =1;
    // Invoke the add call
    var results = NSOA.wsapi.add([budget]);
    NSOA.meta.log('debug', JSON.stringify(results));
    // Get the new ID
    var id = results[0].id;
    return id;
}

function reset_record(record){
    var attributes = [{name:"update_custom",value:"1"}];
    var phase = new NSOA.record.oaProjecttask();
    phase.id = record;
    phase.copyBudget__c = '0';
    phase.copyToPrj__c  = '';
    // Invoke the modify call
    var results = NSOA.wsapi.modify(attributes, [phase]);
    return results;
}