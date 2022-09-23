// Date utils
// Expected OpenAir date format is a string of form: "YYYY-MM-DD 0:0:0"


function date_to_string(date) {
    var d = new Date(date);
    var month = (d.getMonth() + 1).toString();
    var day = d.getDate().toString();
    var year = d.getFullYear();

    // add leading zeros if necessary
    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    return [year, month, day].join('-') + ' 0:0:0';
}


function string_to_date(date_string) {
    var aYMD = date_string.split(' ');
    aYMD = aYMD[0].split('-');
    return new Date(aYMD[0], aYMD[1] - 1, aYMD[2]);
}


function get_day_difference(start_date_string, end_date_string) {
    var start_date = string_to_date(start_date_string);
    var end_date = string_to_date(end_date_string);
    var diff_time = end_date - start_date;
    return Math.ceil(diff_time / (1000 * 60 * 60 * 24));
}


function get_working_day_difference(start_date_string, end_date_string) {
    // source: https://www.codegrepper.com/code-examples/javascript/exclude+weekends+in+javascript+date+calculation
    var startDate = string_to_date(start_date_string);
    var endDate = string_to_date(end_date_string);
    var elapsed, daysBeforeFirstSaturday, daysAfterLastSunday;
    var ifThen = function (a, b, c) {
        return a === b ? c : a;
    };

    elapsed = endDate - startDate;
    elapsed /= 86400000;

    daysBeforeFirstSunday = (7 - startDate.getDay()) % 7;
    daysAfterLastSunday = endDate.getDay();

    elapsed -= (daysBeforeFirstSunday + daysAfterLastSunday);
    elapsed = (elapsed / 7) * 5;
    elapsed += ifThen(daysBeforeFirstSunday - 1, -1, 0) + ifThen(daysAfterLastSunday, 6, 5);

    return Math.ceil(elapsed);
}


function add_days(date_string, days_int) {
    var date = string_to_date(date_string);
    date.setDate(date.getDate() + days_int);
    return date;
}


function add_working_days(date_string, days_int) {
    // source: https://gist.github.com/psdtohtml5/7000529
    var date = Dates.string_to_date(date_string);
    var day = date.getDay();
    date.setDate(date.getDate() + days_int + (day === 6 ? 2 : +!day) + (Math.floor((days_int - 1 + (day % 6 || 1)) / 5) * 2));
    return date;
}


function get_days_to_weekday(date_string) {
    var date = string_to_date(date_string);
    var day = date.getDay();
    var day_shift = 0;
    if (day === 0) {  // Sunday
        day_shift = 1;
    }
    if (day === 6) {  // Saturday
        day_shift = 2;
    }
    return day_shift;
}

function remove_time_create_string(date){
    var string = date_to_string(date);
    var split = string.split(" ");
    var datestring = split[0];
    var splitstring = datestring.split('-');
    var year = splitstring[0];
    var month = splitstring[1];
    var day = splitstring[2];
    var returnstring = month+'/'+day+'/'+year;
    return returnstring;
}

function remove_time_from_string(stringdate){

    var split = stringdate.split(" ");
    var datestring = split[0];
    var splitstring = datestring.split('-');
    var year = splitstring[0];
    var month = splitstring[1];
    var day = splitstring[2];
    var returnstring = month+'/'+day+'/'+year;
    return returnstring;
}

function date_for_gantt(stringdate){
    var split = stringdate.split(" ");
    var datestring = split[0];
    var splitstring = datestring.split('-');
    var year = splitstring[0];
    var month = splitstring[1];
    var day = splitstring[2];
    var returnstring = year+'-'+month+'-'+day;
    return returnstring;
}

function create_oa_date(date){
    var oadate = new NSOA.record.oaDate();
    oadate.day = date.getDate();
    oadate.month = (date.getMonth() + 1);
    oadate.year = date.getFullYear();
    return oadate;
}

// make functions available to other scripts
exports.date_to_string = date_to_string;
exports.string_to_date = string_to_date;
exports.get_day_difference = get_day_difference;
exports.get_working_day_difference = get_working_day_difference;
exports.add_days = add_days;
exports.add_working_days = add_working_days;
exports.get_days_to_weekday = get_days_to_weekday;
exports.remove_time_create_string = remove_time_create_string;
exports.remove_time_from_string = remove_time_from_string;
exports.date_for_gantt =date_for_gantt;
exports.create_oa_date = create_oa_date;