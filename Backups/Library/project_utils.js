// Project utilities
var Errors = require('wsapi_errors');


function get_project_by_attribute(attr_name, attr_value, fields) {  // (str, str, str) -> Project
    var proj = new NSOA.record.oaProject();
    proj[attr_name] = attr_value;
    var req = {
        type: 'Project',
        method: 'equal to',
        fields: fields,
        attributes: [ {name: 'limit', value: '1'} ],
        objects: [ proj ],
    };
    var results = NSOA.wsapi.read(req);
    if (!Errors.check_results(results, 'get_project_by_attribute')) {
        return;
    }
    return results[0].objects[0];
}


// make functions availbale to other scripts
exports.get_project_by_attribute = get_project_by_attribute;