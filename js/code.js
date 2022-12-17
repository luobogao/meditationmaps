
const fontFamily = "Roboto, sans-serif"
const textSizeLarge = 25
const textSizeMed = 18
const textSizeSmall = 12


function receivedFile()
{
    d3.select ("#save-btn").style("display", "flex") 
    console.log ("REVEIVED DATA")
    let string = fr.result
    let data = d3.csvParse (string)
    let headers = data.slice (-1) [0]
    let rows = data.slice (0, data.length - 1)
    let keys = Object.keys (rows [0])
 

}

buildBrowseFile(d3.select("#main"), "test", "t1")