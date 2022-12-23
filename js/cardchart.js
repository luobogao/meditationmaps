function buildCardChart(rows) {
    const cardN = 3
    var svg = d3.select("#chart")
    svg.selectAll("*").remove()

    var cardCollection = []  // Array of entries which have an x-axis value (i) and an array of "cards"
    // {label, distance, waypoint}

    var i = 0
    var n = rows.length

    var x = d3.scaleLinear()
        .domain([0, n])
        .range([0, chartWidth * 0.9])

    var cardWidth = 0.8 * ((x(n) - x(0)) / n)

    var minY = d3.min(rows.map(row => row.distances.slice(0, cardN).slice(-1)[0].distance))
    
    var y = d3.scaleLog()
        .domain([minY, 100])
        .range([chartHeight * 0.8, chartHeight * 0.1])
    rows.forEach(row => {
        if (i > 0) {
            var top3 = row.distances.slice(0, 3)
            var labels = top3.map(e => e.label)
            var add = true
            if (cardCollection.length > 0) {
                var lastCards = cardCollection.slice(-1)[0]
                if (arraysEqual(lastCards.cards.map(e => e.label), labels)) {

                    add = false
                }
                else {

                    add = true
                }



            }
            if (add == true) {
                var newCards = { i: i, cards: top3 }
                cardCollection.push(newCards)
            }


        }
        i++
    })
    var collection_i = 0
    cardCollection.forEach(entry => {
        var cards = entry.cards

        
        var xi = x(entry.i)
        var firstY = y(cards[0].distance)
        var cardHeight = 50
        var cardYmargin = 20
        var lastY = firstY + cardHeight + cardYmargin

        cards.forEach(card => {

            var last_y = 0
            var last_x = 0
            var thisY = d3.max([y(card.distance), lastY]) // Move card down if it overlaps

            // Find the y value of the card from the previous column, to make a smooth line to it
            if (collection_i > 0)
            {
                
                var last_collection = cardCollection[collection_i - 1]
                last_x = x(last_collection.i)
                // Identify the right card using UID
                var last_card_match = last_collection.cards.filter(e => e.waypoint.uid == card.waypoint.uid)
                if (last_card_match.length == 1)
                {
                    var last_card = last_card_match[0]
                    
                    last_y = d3.select("#" + last_card.uid).attr("y")
                    
                }
                else{
                    last_y = 1000
                }
            }
            if (last_y > 0)
            {
                svg.append("line")
                .attr("x1", last_x + cardWidth)
                .attr("y1", last_y + 10)
                .attr("x2", xi)
                .attr("y2", thisY)
                .style("stroke", "black")
            }
            
            svg.append("rect")
                .attr("x", xi)
                .attr("id", card.uid)
                .attr("y", thisY)
                .attr("width", cardWidth)
                .attr("height", cardHeight)
                .attr("fill", "none")
                .attr("rx", "5px")
                .attr("stroke", "black")

            svg.append("text")
                .text(card.waypoint.label)
                .style("font-size", "13px")
                .attr("x", xi + 3)
                .attr("y", thisY + 15)

            svg.append("text")
                .text(card.waypoint.user)
                .style("font-size", "11px")
                .attr("x", xi + 10)
                .attr("opacity", 0.8)
                .attr("y", thisY + 15 + 10)


            lastY = thisY + cardHeight + cardYmargin
        })
        collection_i ++


    })



}