// Project Budget utils

// imports
var Errors = require('wsapi_errors');
var Dates = require('date_utils');

// constants
var LABOUR_LINE_INDEX = '1';
var END_DATE_WEEKLY_INTERVAL = 6;  // Transactions come in weeks; add a week - 1 day (inclusive) to get enddate
var IMPORT_STRING = 'import from booking';  // automatically added to notes of Rules that got imported via Bookings
var BUDGET_TYPE = 'Open';


function get_project_budget_booking_info(project_id) {  // (str) -> Array[Object]
    var info = [];
    var bud_grp = _get_group(project_id);
    if (bud_grp) {
        var bud_rules = _get_rules(bud_grp.id);
        if (bud_rules) {
            for (var i = 0; i < bud_rules.length; i++) {
                NSOA.meta.log('debug', 'Rule Note: ' + bud_rules[i].notes);
                if (bud_rules[i].notes.indexOf(IMPORT_STRING) === -1) {  // skip lines which already were imported via bookings
                    var bud_trans = _get_transactions(bud_grp.id, bud_rules[i].id);
                    if (bud_trans) {
                        var trans_info = _consolidate_transaction_info(bud_trans, bud_rules[i].period);
                        var info_obj = {
                            startdate: trans_info.start_date,
                            enddate: trans_info.end_date,
                            hours: trans_info.hours,
                            userid: _get_jobcode_info(bud_rules[i].job_codeid).userid_fte,
                            customerid: bud_rules[i].customerid,
                            projectid: bud_rules[i].projectid,
                            project_taskid: bud_rules[i].project_taskid,
                            job_codeid: bud_rules[i].job_codeid,
                        };
                        info.push(info_obj);
                    }
                } else {
                    NSOA.meta.log('debug', 'Skipping imported Rule: ' + bud_rules[i].id);
                }
            }
        }
    } else {
        NSOA.meta.log('warning', 'No ' + BUDGET_TYPE + ' Budget could be found for Project Id ' + project_id);
    }
    NSOA.meta.log('debug', 'Returning Booking Info items: ' + info.length);
    return info;
}


// ProjectBudgetRule start_date, end_date and quantity do not hold real values
// depending on Rule period, derive the end date and add all hours
function _consolidate_transaction_info(transaction_array, rule_period) {
    NSOA.meta.log('debug', 'Consolidating transaction data...');
    NSOA.meta.log('debug', 'Budget Rule period: ' + rule_period);
    transaction_array.sort(function(a,b) {  // sort transcations by date
        return Dates.string_to_date(a.date) - Dates.string_to_date(b.date);
    });
    var hours = 0.0;  // budget rule quantity seems to be always 0; add all transaction hours
    var start_date = transaction_array[0].date;
    var end_date = _get_end_date(start_date, transaction_array[transaction_array.length - 1].date, rule_period);
    for (var i = 0; i < transaction_array.length; i++) {
        hours += parseFloat(transaction_array[i].quantity);
        NSOA.meta.log('debug', 'Transaction ' + i + '; Date: ' + transaction_array[i].date + '; Hours: ' + transaction_array[i].quantity);
    }
    NSOA.meta.log('debug', 'Finished consolidating data...');
    NSOA.meta.log('debug', 'End date: ' + end_date);
    NSOA.meta.log('debug', 'Start date: ' + start_date);
    NSOA.meta.log('debug', 'Total Hours: ' + hours);
    return {
        start_date: start_date,
        end_date: end_date,
        hours: hours.toString(),
    };
}


function _get_end_date(start_date_string, end_date_string, period) {  // (str, str, str) -> str
    if (period === 'D' || period === 'T') {  // daily or total
        return end_date_string;
    } else {
        var end_date = Dates.string_to_date(end_date_string);
        if (period === 'W') {  // weekly
            end_date.setDate(end_date.getDate() + END_DATE_WEEKLY_INTERVAL);
        } else if (period === 'M') {  // monthly
            end_date = new Date(end_date.getFullYear(), end_date.getMonth() + 1, 0);
        } else if (period === 'Q') {  // quarterly
            var start_date = Dates.string_to_date(start_date_string);
            end_date = new Date(start_date.getFullYear(), start_date.getMonth() + 3, 0);
        }
        end_date = Dates.date_to_string(end_date);
        return end_date;
    }
}


function _get_group(project_id) {
    var grp = new NSOA.record.oaProjectBudgetGroup();
    grp.projectid  = project_id;
    grp.approval_status = NSOA.context.getParameter('BUDGET_APPROVAL_STATUS') || 'A';
    var req = {
        type: 'ProjectBudgetGroup',
        method: 'equal to',
        fields: 'id, name',
        attributes: [ {name: 'limit', value: '2'} ],
        objects: [ grp ],
    };
    var results = NSOA.wsapi.read(req);
    if (!Errors.check_results(results, '_get_group', true)) {
        return;
    }
    if (results[0].objects) {
        if (results[0].objects.length > 1) {
            throw('Multiple ' + BUDGET_TYPE + ' budgets returned! Please ensure only 1 ' + BUDGET_TYPE + ' Project Budget exists at any given time.');
        }
        NSOA.meta.log('debug', 'Retrieved Group: ' + results[0].objects[0].name);
        return results[0].objects[0];
    } else {
        throw(BUDGET_TYPE + ' Project Budget not found! Please create one.');
    }
}


function _get_rules(budget_group_id) {
    var rule = new NSOA.record.oaProjectBudgetRule();
	rule.project_budget_groupid = budget_group_id;
    rule.category = LABOUR_LINE_INDEX;
    var req = {
        type: 'ProjectBudgetRule',
        method: 'equal to',
        fields: 'id, job_codeid, project_taskid, projectid, customerid, period, notes',
        attributes: [ {name: 'limit', value: '1000'} ],
        objects: [ rule ],
    };
    var results = NSOA.wsapi.read(req);
    if (!Errors.check_results(results, '_get_rules', true)) {
        return;
    }
    NSOA.meta.log('debug', 'Retrieved Rules: ' + results[0].objects.length);
    return results[0].objects;
}


function _get_transactions(budget_group_id, budget_rule_id) {
    var trans = new NSOA.record.oaProjectBudgetTransaction();
    trans.project_budget_groupid = budget_group_id;
    trans.project_budget_ruleid = budget_rule_id;
    var req = {
        type: 'ProjectBudgetTransaction',
        method: 'equal to',
        fields: 'id, date, quantity',
        attributes: [ {name: 'limit', value: '1000'} ],
        objects: [ trans ],
    };
    var results = NSOA.wsapi.read(req);
    if (!Errors.check_results(results, '_get_transactions', true)) {
        return;
    }
    NSOA.meta.log('debug', 'Retrieved Transactions: ' + results[0].objects.length);
    return results[0].objects;
}


// retrieve generic resource id from Jobcode, as it's not availabale in any of the ProjectBudget entities
function _get_jobcode_info(job_code_id) {
    var code = new NSOA.record.oaJobcode();
    code.id = job_code_id;
    var req = {
        type: 'Jobcode',
        method: 'equal to',
        fields: 'id, userid_fte, name',
        attributes: [ {name: 'limit', value: '1'} ],
        objects: [ code ],
    };
    var results = NSOA.wsapi.read(req);
    if (!Errors.check_results(results, '_get_jobcode_info') || !results[0].objects) {
        throw('Could not retrieve information for Job Code ID ' + job_code_id);
    }
    if (!results[0].objects[0].userid_fte || results[0].objects[0].userid_fte === '0') {
        throw('No valid Generic Resource found for Role "' + results[0].objects[0].name + '". Please ensure all Roles have a FTE Generic assigned');
    }
    NSOA.meta.log('debug', 'Retrieved JobCode: ' + results[0].objects[0].name);
    return results[0].objects[0];
}


// make functions availbale to other scripts
exports.get_project_budget_booking_info = get_project_budget_booking_info;