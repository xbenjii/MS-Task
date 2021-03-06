var exec = require('child_process').exec,
    csv = require('csv'),
    fs = require('fs'),
    path = require('path'),
    system32 = 'C:\\Windows\\System32',
    taskListPath = path.join(system32, 'tasklist.exe'),
    taskKillPath = path.join(system32, 'taskkill.exe');

// Call tasklist.exe with the supplied arguments - See https://www.microsoft.com/resources/documentation/windows/xp/all/proddocs/en-us/tasklist.mspx?mfr=true
function taskList(arg, callback) {
    exec(cmdJoin(taskListPath, arg), function(err, stdout) {
        callback(err, stdout);
    });
}

// Search for one or more PIDs that match a give process name
function pidOf(procName, callback) {
    if (isString(procName)) {
        procFilter(procName, function(err, data, amount) {
            callback(err, data, amount);
        });
    } else {
        var err = 'The first pidOf() argument provided is not a string (not a valid process name).';
        callback(err, null, null);
    }
}

// Search for the process name that corresponds with the supplied PID
function nameOf(procNumber, callback) {
    if(isNumber(procNumber)) {
        procFilter(procNumber, function(err, data) {
            callback(err, data);
        });
    } else {
        var err = 'The first nameOf() argument provided is non-numeric (not a valid PID).';
        callback(err, null);
    }
}

// Decides whether a process name or number is returned from procStat
function procFilter(procName, callback) {
    var index = isString(procName) ? 1 : 0,
        result = [];

    procStat(procName, function(err, data, amount) {
        for (var i = 0; i < amount; i++) {
            result.push(data.array[i][index]);
        }

        callback(err, result, amount);
    });
}

// Search for a given process name or PID
function procStat(proc, callback) {
    var filter = isNumber(proc) ? 'PID' : 'IMAGENAME',
        arg = '/fi \"' + filter + ' eq ' + proc + '\" /fo CSV',
        data = new ProcObject;

    fileExists(taskListPath, function(exists) {
        if(exists) {
            taskList(arg, function(err, stdout) {
                csv().from.string(stdout).to.array(function(rows){
                    for (var i = 1; i < rows.length; i++) {
                        data.array.push(rows[i]);
                        data.object.push({
                            name: rows[i][0],
                            pid: rows[i][1],
                            sessionName: rows[i][2],
                            sessionNumber: rows[i][3],
                            memUsage: rows[i][4]
                        })
                    }

                    if (data.array.length < 1) {
                        var noun = isNumber(proc) ? 'PIDs' : 'process names';
                        err = 'There were no ' + noun + ' found when searching for \"' + proc + '\"'
                    }

                    callback(err, data, data.array.length);
                });
            });
        } else {
            callback(taskListPath + ' could not be found!', null, null);
        }
    });
}

// Kill a given process name or PID
function kill(proc, callback) {
    var arg = isNumber(proc) ? '/F /PID ' + proc : '/F /IM ' + proc,
        err = null;

    if (isNumber(proc) || isString(proc)) {
        fileExists(taskKillPath, function(exists) {
            if (exists) {
                exec(cmdJoin(taskKillPath, arg), function(err) {
                    callback(err);
                });
            } else {
                err = taskListPath + ' could not be found!';
                callback(err)
            }
        })
    } else {
        err = 'The first kill() argument provided is neither a string nor an integer (not a valid process).';
        callback(err)
    }
}

// Check if a file exists
function fileExists(path, callback) {
    fs.exists(path, function(exists) {
        callback(exists)
    });
}

// Append parameters to a command
function cmdJoin(cmd, params) {
    params = typeof params == 'undefined' ? '' : ' ' + params;
    return cmd + params
}

// The object which is returned from procStat
function ProcObject() {
    this.array = [];
    this.object = [];
}

// Check if an object is a string
function isString(obj) {
    return Object.prototype.toString.call(obj) == '[object String]'
}

// Check if an object is a number
function isNumber(obj) {
    return /^\d+$/.test(obj)
}

module.exports = taskList;
module.exports.procStat = procStat;
module.exports.pidOf = pidOf;
module.exports.nameOf = nameOf;
module.exports.kill = kill;