// reimplements Gantt chart behaviour in OpenAir
// Runs After Save
// imports
var Errors = require('wsapi_errors');
var Dates = require('date_utils');

var WORK_HOURS = 7.5;  // todo: reference project work schedules
var WEEKEND_COUNT = 2;  // todo: reference project work schedules and exceptions
var ARRAY_SEP = ',';
var PAIR_SEP = ':';


function main(type) {
    try {
        var task = NSOA.form.getNewRecord();
        var all_tasks = _get_project_tasks(task.projectid);
        adjust_task_dates(task, all_tasks, true);
        replace_item_by_value(all_tasks, 'id', task);  // swap old record with the currently-edited task
        update_predecessor_tree(task, all_tasks);
        commit_tasks(all_tasks);  // todo: update only the tasks that changed
    } catch (err) {
        NSOA.meta.log('error', err);
    }
    NSOA.meta.log('info', 'Remaining allowed run time (sec): ' + NSOA.context.remainingTime() / 1000);
    NSOA.meta.log('info', '---------------------------------------------------------');
}


function adjust_task_dates(task, all_tasks, is_current_task) {
    // fill out start/end and duration fields if they are empty
    // if operating on a currently-edited task, the "shape" and duration of the task can change
    // conform the task to its predecessor
    // tasks that are dependant on the currently-edited task might change their "shape" (due to weekend overlap), but should NEVER change their duration
    var dates_changed = false;
    if (task.is_a_phase === '0') {
        NSOA.meta.log('info', '>>> Processing Task: ' + task.name + ', ID ' + task.id);
        var planned_hours = parseInt(task.planned_hours);
        // currently-edited task might have missing data or changed duration; skip milestones (0 planned hours)
        if (is_current_task && planned_hours !== 0) {
            dates_changed = _fill_empty_dates(task);
            dates_changed = _adjust_task_duration(task) || dates_changed;
        }
        dates_changed = _conform_to_predecessor(task, all_tasks) || dates_changed;
        if (planned_hours !== 0) {  // skip milestones (0 planned hours)
            task.planned_hours = _get_planned_hours(task.starts, task.fnlt_date);
        }
        _print_stats(task);
    }
    return dates_changed;
}


function update_predecessor_tree(parent_task, all_tasks) {
    for (var i = 0; i < all_tasks.length; i++) {
        var task = all_tasks[i];
        var parent_id = task.predecessors.split(ARRAY_SEP)[0];  // only look at the first predecessor item
        if (parent_task.id.toString() === parent_id) {
            var dates_changed = adjust_task_dates(task, all_tasks);
            if (dates_changed) {
                update_predecessor_tree(task, all_tasks);
            }
            break;
        }
    }
}


function commit_tasks(task_array) {
    var results = NSOA.wsapi.modify([{name: 'update_custom', value: '1'}], task_array);
    if (Errors.check_results(results, 'commit_tasks', true)) {
        NSOA.meta.log('info', 'Successfully committed ' + task_array.length + ' Task(s)');
    }
}


function get_item_by_value(item_array, key, value) {
    for (var i = 0; i < item_array.length; i++) {
        if (item_array[i][key].toString() === value.toString()) {
            return item_array[i];
        }
    }
}


function replace_item_by_value(item_array, key, item) {
    for (var i = 0; i < item_array.length; i++) {
        if (item_array[i][key].toString() === item[key].toString()) {
            item_array[i] = item;
            return true;
        }
    }
    return false;
}


function _fill_empty_dates(task) {
    // assign start/end dates and duration if any of them are empty
    NSOA.meta.log('debug', 'Assigning missing values...');
    var dates_changes = false;
    var start = Dates.string_to_date(task.starts);
    var end = Dates.string_to_date(task.fnlt_date || task.starts);  // in case end date is empty
    NSOA.meta.log('debug', 'Current start/end dates: ' + task.starts + ' ' + task.fnlt_date);

    if (!task.fnlt_date || end < start) {
        NSOA.meta.log('debug', 'End date is undefined or is behind start...');
        if (task.taskDuration__c && task.taskDuration__c !== '0') {
            NSOA.meta.log('debug', 'Deriving End date from Duration...');
            task.fnlt_date = Dates.add_working_days(task.starts, Math.max(task.taskDuration__c - 1, 0));
        } else {
            NSOA.meta.log('debug', 'Assigning Start date to End date...');
            task.fnlt_date = task.starts;
            task.taskDuration__c = 1;
        }
        dates_changes = true;
    }
    if (!task.taskDuration__c || task.taskDuration__c === '0') {
        task.taskDuration__c = Dates.get_working_day_difference(task.starts, task.fnlt_date) || 1;
        NSOA.meta.log('debug', 'Duration is undefined. New value: ' + task.taskDuration__c);
    }
    return dates_changes;
}


function _conform_to_predecessor(task, all_tasks) {
    var parent_id = task.predecessors.split(ARRAY_SEP)[0];  // only look at the first predecessor item
    var lags = _object_from_string_value_pairs(task.predecessors_lag);
    var types = _object_from_string_value_pairs(task.predecessors_type);
    var duration = Math.max(task.taskDuration__c - 1, 0);
    if (parent_id !== '') {
        var parent = get_item_by_value(all_tasks, 'id', parent_id);
        if (parent) {
            var type = types[parent_id] || 'FS';
            var lag = parseInt(lags[parent_id] || '0');
            if (type === 'FS') {  // start day after parent ends
                task.starts = Dates.date_to_string(Dates.add_working_days(parent.fnlt_date, lag + 1));  // start on the next day
                task.fnlt_date = Dates.date_to_string(Dates.add_working_days(task.starts, duration));
                if (lag < 0) {  // negative lag - push start date back first
                    _push_dates_to_working_days(task, true);
                } else {
                    _push_dates_to_working_days(task, false);
                }
            }
            if (type === 'FF') {  // finish when parent finishes
                task.fnlt_date = Dates.date_to_string(Dates.add_working_days(parent.fnlt_date, lag));
                task.starts = Dates.date_to_string(Dates.add_working_days(task.fnlt_date, -duration));
                if (lag <= 0) {
                    _push_dates_to_working_days(task, true, true);
                } else {
                    _push_dates_to_working_days(task, false, true);
                }
            }
            if (type === 'SF') {  // finish day before parent starts
                task.fnlt_date = Dates.date_to_string(Dates.add_working_days(parent.starts, lag - 1));  // finish the day before
                task.starts = Dates.date_to_string(Dates.add_working_days(task.fnlt_date, -duration));
                if (lag <= 0) {
                    _push_dates_to_working_days(task, true, true);
                } else {
                    _push_dates_to_working_days(task, false, true);
                }
            }
            if (type === 'SS') {  // start on same day parent starts
                task.starts = Dates.date_to_string(Dates.add_working_days(parent.starts, lag));
                task.fnlt_date = Dates.date_to_string(Dates.add_working_days(task.starts, duration));
                if (lag < 0) {  // negative lag - push start date back first
                    _push_dates_to_working_days(task, true);
                } else {
                    _push_dates_to_working_days(task, false);
                }
            }
            return true;
        } else {
            NSOA.meta.log('warning', 'Item with ID ' + parent_id + ' is not a task. Predecessor list will be cleared');
            task.predecessors = '';
            task.predecessors_lag = '';
            task.predecessors_type = '';
        }
    }
    return false;
}


function _adjust_task_duration(task) {
    var old_record = NSOA.form.getOldRecord() || {};
    var duration = parseInt(task.taskDuration__c);
    if (task.taskDuration__c !== old_record.taskDuration__c) {  // duration has changed
        NSOA.meta.log('debug', 'Task duration has been changed...');
        var end_date = Dates.add_working_days(task.starts, Math.max(duration - 1, 0));
        task.fnlt_date = Dates.date_to_string(end_date);
        return true;
    } else if (old_record.starts && old_record.fnlt_date) {  // existing record; task "shape" got changed without editing duration
        NSOA.meta.log('debug', 'Task got Moved. Recalculating duration...');
        var old_actual = Dates.get_day_difference(old_record.starts, old_record.fnlt_date);
        var new_actual = Dates.get_day_difference(task.starts, task.fnlt_date);
        if (old_actual === new_actual) {  // task "shape" hasn't changed - use duration to derive end date
            NSOA.meta.log('debug', 'Task length has not changed...');
            task.fnlt_date = Dates.date_to_string(Dates.add_working_days(task.starts, Math.max(duration - 1, 0)));
            return true;
        } else {  // task "shape" changed - assign new duration
            NSOA.meta.log('debug', 'Task length has changed...');
            task.taskDuration__c = Dates.get_working_day_difference(task.starts, task.fnlt_date);
            task.fnlt_date = Dates.date_to_string(Dates.add_working_days(task.starts, Math.max(task.taskDuration__c - 1, 0)));
            return true;
        }
    }
    return false;
}


function _push_dates_to_working_days(task, inverse, end_first) {
    // start date can't be a weekend and will be pushed to the nearest working day by OpenAir during recalculation
    // shift both start and end dates if necessary
    // "inverse" is used for FF and SF predecessor dependencies, when dates need to be pushed back not forward
    // "end_first" is used in combination with "inverse" on SS and FS, when we have negative lag days
    var duration = Math.max(task.taskDuration__c - 1, 0);
    var days_start = Dates.get_days_to_weekday(task.starts);
    var days_end = Dates.get_days_to_weekday(task.fnlt_date);
    if (inverse) {
        if (end_first) {
            if (days_end > 0) {
                task.fnlt_date = Dates.date_to_string(Dates.add_days(task.fnlt_date, WEEKEND_COUNT / -days_end));
            }
            task.starts = Dates.date_to_string(Dates.add_working_days(task.fnlt_date, -duration));
        } else {
            if (days_start > 0) {
                task.starts = Dates.date_to_string(Dates.add_days(task.starts, WEEKEND_COUNT / -days_start));
            }
            task.fnlt_date = Dates.date_to_string(Dates.add_working_days(task.starts, duration));
        }
    } else {
        if (end_first) {
            if (days_end > 0) {
                task.fnlt_date = Dates.date_to_string(Dates.add_days(task.fnlt_date, WEEKEND_COUNT));
            }
            task.starts = Dates.date_to_string(Dates.add_working_days(task.fnlt_date, -duration));
        } else {
            if (days_start > 0) {
                task.starts = Dates.date_to_string(Dates.add_days(task.starts, days_start));
            }
            task.fnlt_date = Dates.date_to_string(Dates.add_working_days(task.starts, duration));
        }
    }
    return true;
}


function _get_planned_hours(start_string, end_string) {
    var diff_days = Math.abs(Dates.get_working_day_difference(start_string, end_string));
    return diff_days * WORK_HOURS;
}


function _get_project_tasks(project_id) {
    var obj = new NSOA.record.oaProjecttask();
    obj.projectid = project_id;
    var req = {
        type: 'Projecttask',
        method: 'equal to',
        fields: 'id, name, starts, fnlt_date, taskDuration__c, planned_hours, predecessors, predecessors_lag, predecessors_type, is_a_phase',
        attributes: [{name: 'limit', value: '1000'}],
        objects: [obj],
    };
    var results = NSOA.wsapi.read(req);
    if (!Errors.check_results(results, '_get_project_tasks', true)) {
        return;
    }
    // convert results to array of Task objects
    var tasks = [];
    var raw_tasks = results[0].objects;
    for (var i = 0; i < raw_tasks.length; i++) {
        var r_task = raw_tasks[i];
        if (r_task.is_a_phase === '0') {
            var task = new NSOA.record.oaProjecttask();
            for (var key in r_task) {
                if (r_task.hasOwnProperty(key)) {
                    task[key] = r_task[key];
                }
            }
            tasks.push(task);
        }
    }
    NSOA.meta.log('debug', 'Retrieved Tasks: ' + tasks.length);
    return tasks;
}


function _object_from_string_value_pairs(string) {
    var arr = string.split(ARRAY_SEP);
    var obj = {};
    arr.forEach(function (property) {
        var tup = property.split(PAIR_SEP);
        obj[tup[0]] = tup[1];
    });
    return obj;
}


function _print_stats(task) {
    NSOA.meta.log('info', 'Start date: ' + task.starts);
    NSOA.meta.log('info', 'End date: ' + task.fnlt_date);
    NSOA.meta.log('info', 'Duration: ' + task.taskDuration__c);
    NSOA.meta.log('info', 'Planned hours: ' + task.planned_hours);
    NSOA.meta.log('info', 'Predecessors: ' + task.predecessors);
    NSOA.meta.log('info', 'Predecessor lag: ' + task.predecessors_lag);
    NSOA.meta.log('info', 'Predecessor type: ' + task.predecessors_type);
}