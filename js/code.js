
const fontFamily = "Roboto, sans-serif"
const textSizeLarge = 25
const textSizeMed = 18
const textSizeSmall = 12

var state =
{
    "filename": "<filename>",
    "model":
    {
        "mapped": null, // Mapped x-y coordinates of each standard vector
    }

}

function receivedFile() {

    console.log("REVEIVED DATA")
    let string = fr.result
    let data = d3.csvParse(string)
    let headers = data.slice(-1)[0]
    let rows = data.slice(0, data.length - 1)
    let keys = Object.keys(rows[0])
    processMuseData(rows)


}
function processMuseData(csv) {
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
    state.filename = d

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

            if (variance > motion_variance_max) {

                rows[i].moving = true
            }

        })


    }
    // remove rows with too much motion
    rows = rows.filter(e => e.moving).length

    // Remove last 10 seconds and first 10 seconds - user is probably moving during this time
    rows = rows.slice(10, rows.length - 10)

    let last_timestamp = parseTime(rows.slice(-1)[0].TimeStamp)
    let total_seconds = Math.round((last_timestamp - first_timestamp) / 1000)
    let total_hours = total_seconds / 60 / 60

    // Rows standardized to one per second
    var standardRows = []
    for (var s = 0; s < total_seconds; s++) {
        let row = rows.filter(r => r.seconds == s)[0]
        if (row) standardRows.push(row)
    }

    var lowResolution = 60   // average over 60 seconds
    var highResolution = 10  // average over 10 seconds

    if (total_hours > 0.8) {
        // Long file, using longer rounding   
    }

    let averageHighRes = averageRows(clone(standardRows), highResolution)
    let averageLowRes = averageRows(clone(standardRows), lowResolution)

    if (averageLowRes.length < 5) {
        alert("Meditation session was too short!")
    }
    state.lowRes = averageLowRes
    state.highRes = averageHighRes
    const first_seconds = standardRows[0].seconds
    const last_seconds = standardRows.slice(-1)[0].seconds
    state.seconds_low = first_seconds
    state.seconds_high = last_seconds
    updateChart()


}

buildBrowseFile(d3.select("#browse-div"), "UPLOAD", "t1")

function averageRows(rows, roundN) {
    roundN = Math.round(roundN)
    const roundN_half = Math.round(roundN / 2)
    let newRows = []
    for (let i = roundN_half + 1; i < rows.length - roundN_half; i = i + roundN_half) {
        if (i < rows.length) {
            let row = rows[i]
            let newRow = {}
            newRow.seconds = row.seconds
            newRow.minutes = row.minutes
            newRow.vector = getVector(row)

        }
    }
}

function updateChart() {

}

function buildModel() {
    var data = Object.entries(standard_vectors).map(e => e[1].vector)
    var principals = pca(data)
    state.model.principals = principals
    var model = runModel(data, principals)
    
    // Store these mapped coorindate in each standard's entry 
    var keys = Object.keys(standard_vectors)
    for (var c = 0; c < keys.length; c++) {
        var coord = model[c]
        var key = keys[c]
        standard_vectors[key].coordinates = coord

    }
    
}
buildModel()
