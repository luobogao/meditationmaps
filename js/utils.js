function ratio(x, y)
{
    var opt1 = round ( 100.0 * ((x / y) - 1.0))
    var opt2 = round ( 100.0 * (1.0 + (-1.0 * ( y / x))))

    if (x > y) return opt1
    else return opt2
}

function parseTime (str)
{

    if (str.length == 13 || typeof str === "number")
    {
        return parseInt(str)
    }
    else 
    {
        let format = "YYYY-MM-DD HH:mm:ss.SSS"
        let date = moment (str, format)
        let millis = date.valueOf ()
        return millis
    }

}
function round(v)
{
    return Math.round(v * 10000) / 10000
}
function clone(obj)
{
    return JSON.parse(JSON.stringify(obj))
}