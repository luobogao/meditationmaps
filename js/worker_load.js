
// Workers need to import their own libraries
importScripts("d3.min.js")
importScripts("moment.min.js")
importScripts("utils.js")
importScripts("analysis.js")


const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})

// Listen for the main app to send a full string of a loaded file
self.addEventListener("message", function(e) {
    var filestring = e.data
    let data = d3.csvParse(filestring)
    let headers = data.slice(-1)[0]
    let rows = data.slice(0, data.length - 1)
    let keys = Object.keys(rows[0])
    processMuseData(rows)

}, false);


function processMuseData(rows) {
    // Cleans up and pre-processes the data from a Muse CSV
    // Removes blank rows, adds timestamps, removes rows where user is moving too much, then averages this data


    if (rows.length > 100000)
    {
        alert("File is too large!")
        return;
    }
    // This object will hold all the resulting data, then be stringified and passed back to app
    var returnObj = {}

    
    // Remove rows with blank data
    rows = rows.filter(row => row.Delta_TP9 || row.Theta_AF8 || row.Beta_AF7 || row.Gamma_TP10) // remove blank rows

    // This file only had blank rows
    if (rows.length == 0) {
        alert("No data!")
    }

    console.log("Loading " + rows.length + " rows")

    // First timestamp - used to define the start time of this meditation
    let first_timestamp = parseTime(rows[0].TimeStamp)

    // First timestamp can't be parsed - use current time as starting point and increment by 1 sec per row
    if (typeof first_timestamp != "number" || isNaN(first_timestamp) || first_timestamp < 1000000) {
        console.log("Bad timestamps")
        var date = new Date()
        first_timestamp = date.getMilliseconds()
        var i = 0
        rows.forEach(row => {
            row.TimeStamp = first_timestamp + (i * 1000)
            i++
        })
    }

    // Build a full human-readable timestamp for this file - used when saving images
    let f = "ddd DD-MMM-YYYY hh:mm A"
    let d = moment(first_timestamp).format(f)
    returnObj.filename = d

    // Clean Data
    for (let r = 0; r < rows.length; r++) {
        let row = rows[r]

        // Convert all EEG values from log10 to raw values
        band_channels.forEach(ch => {
            let logValue = row[ch]
            let rawValue = Math.pow(10, logValue)

            row[ch] = round(parseFloat(rawValue))
        })

        row.acc_x = row["Accelerometer_X"]
        row.acc_y = row["Accelerometer_Y"]
        row.acc_z = row["Accelerometer_Z"]


        let timestamp = parseTime(row.TimeStamp)

        row.seconds = Math.round((timestamp - first_timestamp) / 1000) // seconds since beginning of meditation
        row.secondsFull = Math.round(timestamp / 1000) // Seconds since origin
        row.minutes = Math.round(row.seconds / 60) // minutes since beginning of meditation

    }
    // Calculate motion - set "moving = true" if motion is too high
    var motion_variance_max = 0.01
    for (let i = 0; i < rows.length - 10; i++) {

        var motion = ["acc_x", "acc_y", "acc_z"]
        motion.forEach(col => {
            let avgArray = []
            for (let a = i; a < i + 10; a++) {

                let val = rows[a][col]
                if (!isNaN(val)) {
                    avgArray.push(val)
                }

            }
            var variance = d3.variance(avgArray)
            rows[i][col + "_variance"] = variance

            // Variance from motion is too high - flag this row for removal in next step
            if (variance > motion_variance_max) {

                rows[i].moving = true
            }

        })


    }
    // remove rows with too much motion
    rows = rows.filter(e => e.moving != true)

    // Remove last 10 seconds and first 10 seconds - user is probably moving during this time
    rows = rows.slice(10, rows.length - 10)
    console.log("Validated rows: " + rows.length)

    let last_timestamp = parseTime(rows.slice(-1)[0].TimeStamp)
    let total_seconds = Math.round((last_timestamp - first_timestamp) / 1000)
    let total_hours = total_seconds / 60 / 60

    // Rows standardized to one per second
    var standardRows = []
    for (var s = 0; s < total_seconds; s++) {
        let row = rows.filter(r => r.seconds == s)[0]

        if (row) {
            row.vector = getRootVector(row)
            standardRows.push(row)
        }
    }
    console.log("Standardized rows")

    var lowResolution = 60   // average over 60 seconds
    var highResolution = 10  // average over 10 seconds

    // Long duration meditations should using longer rounding
    if (total_hours > 0.8) {

    }

    // Perform two different rounding operations with different average N
    let averageHighRes = averageRows(clone(standardRows), highResolution)
    let averageLowRes = averageRows(clone(standardRows), lowResolution)
    let average10 = averageRows(clone(standardRows), standardRows.length / 10)
    let averageMax = averageRows(clone(standardRows), standardRows.length / 100)
    

    if (averageLowRes.length < 3) {
        alert("Meditation session was too short: " + averageLowRes.length + " minutes")
    }
    
    returnObj.raw = clone(standardRows)
    returnObj.lowRes = averageLowRes
    returnObj.highRes = averageHighRes
    returnObj.avg10 = average10
    returnObj.averageMax = averageMax

    // Find the first and last timestamp for timeseries chart x-axis
    const first_seconds = standardRows[0].seconds
    const last_seconds = standardRows.slice(-1)[0].seconds
    returnObj.seconds_low = first_seconds
    returnObj.seconds_high = last_seconds

    // Data is ready for plotting
    averageLowRes.forEach(entry => {
        //console.log(getRootVector(entry)) show all vectors
    })

    postMessage(JSON.stringify(returnObj))


}

function averageRows(rows, roundN) {

    
    console.log("Rounding with " + roundN + " in " + rows.length + " rows")
    roundN = Math.round(roundN)
    if (roundN <= 1) {
        console.log("ERROR: rounding is too low, using raw rows")
        return rows
    }
    else {
        const roundN_half = Math.round(roundN / 2)
        let newRows = []
        for (let i = roundN_half + 1; i < rows.length - roundN_half; i = i + roundN_half) {
            if (i < rows.length) {
                let row = rows[i]
                let newRow = {}
                newRow.seconds = row.seconds
                newRow.minutes = row.minutes

                // Average each band + channel
                bands.forEach(band => {
                    channels.forEach(channel => {
                        let avgArray = []
                        const key = band + "_" + channel // "Gamma_TP10"

                        for (let a = i - roundN_half; a < i + roundN_half; a++) {
                            var row = rows[a]

                            let val = row[key]
                            if (!isNaN(val)) {
                                avgArray.push(val)
                            }

                        }
                        // If there are not enough valid values for an average, return NaN
                        if (avgArray.length > roundN_half) {
                            let avg = round(d3.quantile(avgArray, 0.5))
                            let max = round(d3.quantile(avgArray, 0.95))
                            let min = round(d3.quantile(avgArray, 0.05))
                            newRow[key] = avg
                            newRow[key + "_min"] = min
                            newRow[key + "_max"] = max

                        }
                        else {

                            newRow[key] = NaN
                        }

                    })
                })

                newRow.vector = getRootVector(newRow) // Compute the averaged vector

                newRows.push(newRow)

            }
        }
        return newRows
    }

}