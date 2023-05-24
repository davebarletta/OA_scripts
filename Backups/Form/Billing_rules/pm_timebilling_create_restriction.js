function main(type) {
    if (type === 'new'){
        var user = NSOA.wsapi.whoami();
        var roleid = user.role_id;
        var role = NSOA.record.oaRole(roleid);
        var rolename = role.name;
        if (rolename === 'Project Manager' || rolename === 'Project Manager Contractor' || rolename === 'PM Contractor' || rolename ==='Senior Project Manager'){
            NSOA.form.error('', "Please reach out to a member of the operations team if you need to create a new billing rule.");
        }
            
    }else{
        return;
    }
}