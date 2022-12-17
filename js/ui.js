

function clickDiscord()
{
    
    window.open(
        "https://discord.gg/FQEthg67",
        '_blank' // <- This is what makes it open in a new window.
    );
}
function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    document.getElementById("open_btn").style.display = "none"
    document.getElementById("main").style.marginLeft = "250px";
  }
  
  function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("open_btn").style.display = "flex"
    document.getElementById("main").style.marginLeft= "0";
  }
function buildBrowseFile (div, label, id)
{
    var width= "80px"
    let holder = div.append ("div")
        .style ("position", "relative")
        .attr ("font-family", fontFamily)
        .attr ("font-size", textSizeMed + "px")
        .attr ("id", id + "-all")
        .style ("width", width)

    holder
        .append ("input")
        .style ("position", "relative")
        .style ("text-align", "right")
        .style ("opacity", 0)
        .style ("z-index", 2)
        .attr ("class", "browse-id")
        .style ("width", width)
        .attr ("type", "file")
        .on ("mouseover", function(d) {
            d3.select(this).style("cursor", "pointer");
            d3.select ("#" + id)
                .style ("background", "grey")
                .style ("border-radius", "5px")

        })

        .on ("mouseout", function(d) {
            d3.select(this).style("cursor", "default");
            d3.select ("#" + id)
                .style ("border-radius", "5px")
                .style ("background", "#f0f0f0")
        })

        .on ("change", function (evt){
            document.getElementById (id).click ()
            
            let file = evt.target.files [0]

            fr = new FileReader ()
            fr.onload = receivedFile
            fr.readAsText (file)




        })


    let fakefile = holder.append ("div")
        .style ("position", "absolute")
        .style ("top", "0px")
        .style ("left", "0px")
        .style ("z-index", 1)

    let btn = fakefile.append ("button")
        .style ("font-size", "18px")
        .attr ("font-family", fontFamily)
        .attr("color", "#ececf1ff")
    //.style ("height", "30px")
        .attr ("id", id)
        .text (label)

}
