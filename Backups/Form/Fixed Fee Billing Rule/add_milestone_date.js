function main(type) {
    // On Submit
    var allValues = NSOA.form.getAllValues();
    var milestone = allValues.start_milestone;
    if (milestone !== null || milestone !== ''){
        var results = search_milestone(milestone);
        NSOA.meta.log('debug', JSON.stringify(results));
    }
}

function search_milestone(id){
    // Create the issue object
    var milestone = new NSOA.record.oaProjecttask();
    milestone.id = id;
    // Define the read request
    var readRequest = {
        type : 'Projecttask',
        method : 'equal to', // return only records that match search criteria
        fields : 'id, starts', // specify fields to be returned
        attributes : [ // Limit attribute is required; type is Attribute
            {
                name : 'limit',
                value : '1'
            }
        ],
        objects : [ // One object with search criteria; type implied by rr type
            milestone
        ]
    };
    // Invoke the read call
    var results = NSOA.wsapi.read(readRequest);
	return results;
}