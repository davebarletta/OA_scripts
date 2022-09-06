//Runs On Submit
// imports
var Budgets = require('project_budget_utils');
var Errors = require('wsapi_errors');

var TRIGGER_FIELD = 'prjGenerateBookingsFromProjectBudget__c';


function main(type) {
    try {
        var generate = NSOA.form.getValue(TRIGGER_FIELD);
        if (generate) {
            NSOA.wsapi.disableFilterSet(true);  // disable user permission filtering for successful execution
            NSOA.form.setValue(TRIGGER_FIELD, false);  // disable checkbox
            var project = NSOA.form.getOldRecord();
            var id = project.id;
            var name = NSOA.form.getValue('name');
            NSOA.meta.log('info', 'Generating budget Bookings for Project: ' + name + ' - ID ' + id);
            if (!generate_bookings(id)) {
                NSOA.meta.log('info', 'No new Bookings found for Project: ' + name + ' - ID ' + id);
            }
            NSOA.meta.log('info', 'Remaining allowed run time (sec): ' + NSOA.context.remainingTime() / 1000);
            NSOA.meta.log('info', '---------------------------------------------------------');
        }
    } catch(err) {
        NSOA.meta.log('error', err);
        NSOA.meta.log('info', '---------------------------------------------------------');
        NSOA.form.error(TRIGGER_FIELD, err);
    }
}


// Generate generic bookings from labour categories of an approved Project Budget
// It is assumed that there's only one approved Target Budget for a Project at any given time
function generate_bookings(project_id) {  // (str) -> bool
    var info = Budgets.get_project_budget_booking_info(project_id);
    if (info && info.length > 0) {
        var all_bookings = [];
        for (var i = 0; i < info.length; i++) {
            var booking = _get_booking_object(info[i]);
            all_bookings.push(booking);
        }
        var results = NSOA.wsapi.add(all_bookings);
        if (Errors.check_results(results, 'generate_bookings', true)) {
            NSOA.meta.log('info', 'Generated Bookings: ' + info.length);
            return true;
        }
    }
    return false;
}


function _get_booking_object(booking_info) {
    var booking = new NSOA.record.oaBooking();
    booking.startdate = booking_info.startdate;
    booking.enddate = booking_info.enddate;
    booking.userid = booking_info.userid;
    booking.hours = booking_info.hours;
    booking.customerid = booking_info.customerid;
    booking.projectid = booking_info.projectid;
    booking.project_taskid = booking_info.project_taskid;
    booking.job_codeid = booking_info.job_codeid;
    booking.booking_typeid = NSOA.context.getParameter('DEFAULT_BOOKING_TYPE_ID');  // e.g.: Pencil = 1

    NSOA.meta.log('debug', 'Booking Type ID: ' + booking.booking_typeid);
    NSOA.meta.log('debug', 'Booking JobCode ID: ' + booking.job_codeid);
    NSOA.meta.log('debug', 'Booking Project ID: ' + booking.projectid);
    NSOA.meta.log('debug', 'Booking Task ID: ' + booking.project_taskid);
    NSOA.meta.log('debug', 'Booking Customer ID: ' + booking.customerid);
    NSOA.meta.log('debug', 'Booking End date: ' + booking.enddate);
    NSOA.meta.log('debug', 'Booking Start date: ' + booking.startdate);
    NSOA.meta.log('debug', 'Booking Hours: ' + booking.hours);
    NSOA.meta.log('debug', 'Booking User ID: ' + booking.userid);
    NSOA.meta.log('debug', 'Generating booking...');

    return booking;
}