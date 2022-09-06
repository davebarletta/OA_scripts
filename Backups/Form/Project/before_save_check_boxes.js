function main(type) {
    //On Submit
    var user = NSOA.wsapi.whoami();
    var userid = user.id;
    NSOA.meta.log('debug', 'Current User: ' + userid);
    var prjcode = NSOA.form.getValue('prjCode__c');
    trim_prj_code(prjcode);
    var all = NSOA.form.getAllValues();
    var loalink = all.loiLink__c;
    var contractlink = all.contractLink__c;
    set_checkboxes(userid, loalink, contractlink);
    var substage = all.prjSubStage__c;
    set_project_stage(substage, contractlink);
    check_po(all);
    
    
}

function set_checkboxes(user, loalink, contractlink){
    try{
        if (loalink === null || loalink === '' || user == 6) {
            NSOA.meta.log('debug', 'The script will do nothing.');
        }else{
            NSOA.form.setValue('prjLOI__c', true);
        }
        
        if (contractlink === null || contractlink === '' || user == 6) {
            NSOA.meta.log('debug', 'The script will do nothing.');
        }else{
            NSOA.form.setValue('prjContractSigned__c', true);
        }
    }catch (error){
        NSOA.meta.log('error', error);
    }
}

function set_project_stage(substage, contractlink){
    switch(substage){
        case '0. Complete':
            	NSOA.form.setValue('project_stage_id', 3);          
            break;
        case '1. Confirmed': 
                NSOA.form.setValue('project_stage_id', 3);                            
            break;
        case '2. Paused': 
            NSOA.form.setValue('project_stage_id', 3);
            break;
        case '3. Agreement in Principle': 
            NSOA.form.setValue('project_stage_id', 2);
            break;
        case '4. Negotiation / Review': 
            NSOA.form.setValue('project_stage_id', 2);
            break;
        case '5. Proposal Submitted': 
            NSOA.form.setValue('project_stage_id', 2);
            break;
        case '6. Proposal Requested': 
            NSOA.form.setValue('project_stage_id', 2);
            break;
        case '00. Archived': 
            NSOA.form.setValue('project_stage_id', 4);
            break;
        case '7. Internal' : 
            NSOA.form.setValue('project_stage_id', 1);
            break;
        default:
            NSOA.form.setValue('project_stage_id', 2);
            
    }
    NSOA.meta.log('debug', 'Project substage: ' + substage);
    return substage;
}

function trim_prj_code(prjcode){
    var prjsplit = prjcode.split(":");
    var truecode = prjsplit[prjsplit.length - 1];
    NSOA.form.setValue('prjCode__c', truecode);
    
}

function check_po(allr){
    if(allr.prj_create_po__c == '1'){
        if(allr.prj_custpo_amt__c  === 0){
            NSOA.form.error('prj_custpo_amt__c', 'Please enter an amount...');
        }
        if(allr.prj_custpo_date__c  == '0000-00-00' || allr.prj_custpo_date__c === null){
            NSOA.form.error('prj_custpo_date__c', 'Please enter a date...');
        }
        if(allr.prjSoNotes__c   === '' || allr.prjSoNotes__c  === null){
            NSOA.form.error('prjSoNotes__c', 'Please enter some notes...');
        }
        if(allr.prjSoLink__c    === '' || allr.prjSoLink__c   === null){
            NSOA.form.error('prjSoLink__c', 'Please add a link...');
        }
    }else{
        return;
    }
}