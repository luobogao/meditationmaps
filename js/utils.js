debug = false
function centroid(matrix)
{
    
    var center = {
        x: d3.mean(matrix.map(e => e.x)), y: d3.mean(matrix.map(e => e.y)), z: d3.mean(matrix.map(e => e.z))
    }
    
    return center
}
function unique(arr)
{
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    return arr.filter(onlyUnique)
}



function ratio(x, y)
{
    var opt1 = round ( 100.0 * ((x / y) - 1.0))
    var opt2 = round ( 100.0 * (1.0 + (-1.0 * ( y / x))))

    if (x > y) return opt1
    else return opt2
}
function getEveryNth(arr, nth) {
    const result = [];
    nth = Math.floor(nth)
    if (nth == 0) nth = 1

    if (nth == 1)
    {
        return arr
    }
    else
    {
        for (let i = 0; i < arr.length; i += nth) {
            result.push(arr[i]);
        }
    
        return result;
    }

    
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
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
  
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
  
    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
function clone(obj)
{
    return JSON.parse(JSON.stringify(obj))
}
function uid(){
    var randomStrLength = Math.floor(Math.random() * 10) + 5,
    pool = 'abcdefghijklmnopqrstuvwxyz1234567890',
    randomStr = '';
    
    var pl = pool.length
    for (var i = 0; i < randomStrLength; i++) {
         var randomChar = pool.substr(Math.floor(Math.random() * pl), 1);
         randomStr += randomChar;     
    }
    
    return "uid_" + randomStr;
}
function debug(message)
{
    if (debug == true)
    {
        console.log(message)
    }
}
function log(message)
{
    console.log(message)
}