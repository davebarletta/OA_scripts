// Utilities for handling API errors


function check_results(result, error_title, raise) {  // (ResultObject, str, Optional[bool]) -> Optional[ResultObject]
    if (!result || !result[0]) {
        var msg = 'Error: ' + error_title + ' - Operation did not return any results!';
        NSOA.meta.log('error', msg);
        if (raise) throw(msg);
    } else if (result[0].errors !== null && result[0].errors.length > 0) {
        result[0].errors.forEach(function(err) {
            var fullError = 'Error: ' + error_title + ' - ' + err.code + ' - ' + err.comment + ' ' + err.text;
            NSOA.meta.log('error', fullError);
            if (raise) throw(fullError);
        });
    } else {
        return result;
    }
}


// make functions availbale to other scripts
exports.check_results = check_results;