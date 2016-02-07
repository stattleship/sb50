 
 //from http://stackoverflow.com/questions/1960473/unique-values-in-an-array
 Array.prototype.getUnique = function(){
    var u = {}, a = [];
    for(var i = 0, l = this.length; i < l; ++i){
        if(u.hasOwnProperty(this[i])) {
            continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
    }
    return a;
}
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};



function build() {

    var width = Math.min(Math.max(320, $('.d3-container').innerWidth()),800),
        height = $('.d3-container').innerHeight() - $('.button-container').outerHeight(true) - 2 * $('.chart.title').outerHeight(true) - 2 * $('.hbar').outerHeight(true) - 131,
        padding = 1, // separation between same-color nodes
        clusterPadding = 2, // separation between different-color nodes
        maxRadius = 20,
        mult = Math.pow((width / 320),1.5);


    var startPre;
    var startGame;
    var endGame;
    var endPost;

    var color = function(group) {
        var colorObj = {
                    0: '#FB4F14',
                    1: '#0088CE',
                    2:'#FFDE69',
                    3:'#002244',
                    4:'#A5ACAF'
                    }

        return colorObj[group]
    }

    $('.button-hash').each(function() {
        $(this).css('border-color',color(this.id))
    })


    var line = d3.select('.chart-line').append("svg")
        .attr("width", width)
        .attr("height", '125px');


    var svg = d3.select('.chart-bubble').append("svg")
        .attr("width", width)
        .attr("height", height);

    d3.json("nodes.json", function(error, graph) {

        if (error) throw error;

        //finds all the date chunks
        var datetimeUnique = graph.nodes.map(function(d) {
            return d.datetime;
        }).getUnique()

        var groupArray = graph.nodes.map(function(d) {
            return d.group;
        }).getUnique()

        //gets date chunks for interface
        var timeRange = d3.extent(datetimeUnique)
        var startPreT = datetimeUnique[0]//timeRange[0]
        var startGameT = Date.UTC(2016,1,7,23,30)
        var endGameT = Date.UTC(2016,1,7,28,0)
        var endPostT = Date.UTC(2016,1,7,32,0) //timeRange[1]
        timeRange = [startPreT, endPostT]

        var outArray = []
        var timeSeriesArray = []
        var idArray = [2]
        var lineMax = 0;
        var nodesArray;
        var force;
        var max;

        var clusters;

        var total_emoji = graph.nodes.reduce(function(p,c) {
            return p + c.radius
        },0)
        console.log(total_emoji)
        //filters date chunks
        function buildData(a,b) {

            outArray = []
            timeSeriesArray = []
            var buildNodes = graph.nodes.slice(0)

            buildNodes = buildNodes.filter(function(d) {
                return d.datetime >= a && d.datetime <= b
            })

            groupArray.forEach(function(value, index) {

                var groupNodes = buildNodes.filter(function(d) {
                    return d.group === value
                })

                datetimeUnique.forEach(function(dt, i) {
                    var groupTimeNodes = groupNodes.filter(function(d) {
                        return d.datetime == dt
                    })
                    var emojiCount = groupTimeNodes.reduce(function(p,c) {
                        return p + c.radius
                    },0)
                    timeSeriesArray.push({"group": value, "datetime": dt, "emoji": emojiCount})
                })


                nodesArray = groupNodes.map(function(d) {return d.name;}).getUnique()

                nodesArray.forEach(function(d) {
                    outArray.push({"group": value, "name": d, "radius": groupNodes.filter(function(e) {return e.name === d }).map(function(e){ return e.radius; }).reduce(function(p,c) {return p + c; }),
                    // "text": groupNodes.filter(function(e) {return e.name === d }).map(function(e){ return e.text; }).reduce(function(p,c) {return p.concat(c); })
                    })
                })
            })

            lineMax = Math.max(lineMax, timeSeriesArray.reduce(function(p,c) {

                return Math.max(p,c.emoji)
            },0))

            var m = 2
            clusters = new Array();

            max = buildNodes.reduce(function(prev,cur) {

                return Math.max(prev, cur.radius)
            }, 0)

            //finds the largest node in cluster
            outArray.forEach(function(d, i) {

                outArray[i].radius = Math.sqrt((10*d.radius/max*mult)/Math.PI*50) //RADIUS Size CHANGE***

                outArray[i].y = d.group * height / m /2
                if (!clusters[d.group] || (d.radius > clusters[d.group].radius))
                    {
                        clusters[d.group] = d;
                    }
                maxRadius = Math.max(maxRadius, d.radius)
            })

            outArray = outArray.filter(function(d) {
                return d.radius/Math.pow(mult,.5) > 5; //FILTER
            })

            force = d3.layout.force()
                .gravity(.01)
                .charge(-2)
                .friction(.8)
                .size([width, height])
                .nodes(outArray)
                .start();
        }
        buildData(startPreT,endPostT)


            function BuildLine() {

                var scaleX;
                var scaleY;
                var lineGen;

                this.initialize = function() {

                    scaleX = d3.scale.linear()
                        .domain(timeRange)
                        .range([15,width-15])

                    var axisX = d3.svg.axis()
                        .scale(scaleX)
                        .orient("bottom")
                        .tickValues([startPreT, startGameT,endGameT, endPostT])
                        .tickFormat(function(d) {
                            
                            function leadZero(min) {
                                return min < 10 ? '0' + min : min
                            }

                            var dt = new Date(d)
                            var ampm =  dt.getHours() > 11 ? ' PM' : ' AM'
                            return dt.getHours() > 12 ? dt.getHours() % 12 + ':' + leadZero(dt.getMinutes(2)) + ampm : dt.getHours() + ':' + leadZero(dt.getMinutes(2)) + ampm
                        })
                        .outerTickSize(4)

                    scaleY = d3.scale.linear()
                        .domain([0,lineMax])
                        .range([125-20, 2])

                    lineGen = d3.svg.line()
                        .x(function(d,i) { return scaleX(d.datetime); })
                        .y(function(d) { return scaleY(d.emoji); })
                        .interpolate("linear")

                    startPre = scaleX(startPreT)//scaleX(Date.UTC(2016,1,4,20,00))
                    startGame = scaleX(startGameT)
                    endGame = scaleX(endGameT)
                    endPost = scaleX(endPostT)//scaleX(Date.UTC(2016,1,5,23,00))

                    line.selectAll('*').remove()

                    var axis = line.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + 105 + ")")
                        .call(axisX)
                        
                       axis.select("text")
                        .style("text-anchor", "start");
                        
                    $('.axis text:last').css("text-anchor", "end");
                        
                        
                    
                        
                    //pregame
                    line.append('rect')
                        .attr('x', startPre)
                        .attr('width', startGame - startPre)
                        .attr('y', scaleY(lineMax))
                        .attr('height', scaleY(0) - 2)
                        .style('fill', '#707070')
                        .attr('class', function() {
                            return datetimeUnique.slice(-1) > startPreT ? 'time pre click' : 'time pre'
                        })
                        .attr('data-time', 'pre')

                    line.append('text')
                        .attr('x', (startPre+startGame)/2)
                        .attr('y', scaleY(0)/2)
                        .attr('text-anchor','middle')
                        .attr('class', function() {
                            return datetimeUnique.slice(-1) > startPreT ? 'time pre linechart click' : 'time pre linechart'
                        })
                        .style('fill','#eeeeee')
                        .text('Pre')

                    //during the game
                    line.append('rect')
                        .attr('x', startGame + 5)
                        .attr('width', endGame - startGame - 5)
                        .attr('y', scaleY(lineMax))
                        .attr('height', scaleY(0)-2)
                        .style('fill', '#707070')
                        .attr('class', function() {
                            return datetimeUnique.slice(-1) > startGameT ? 'time game click' : 'time game'
                        })
                        .attr('data-time', 'game')
                        .style('cursor', function() {
                            return datetimeUnique.slice(-1) > startGameT ? 'pointer' : 'default'
                        })

                    line.append('text')
                        .attr('x', (startGame+endGame)/2+2)
                        .attr('y', scaleY(0)/2)
                        .attr('text-anchor','middle')
                        .attr('class', function() {
                            return datetimeUnique.slice(-1) > startGameT ? 'time game linechart click' : 'time game linechart'
                        })
                        .style('fill','#eeeeee')
                        .style('cursor', function() {
                            return datetimeUnique.slice(-1) > startGameT ? 'pointer' : null
                        })
                        .text('SB50')

                    //after the game
                    line.append('rect')
                        .attr('x', endGame + 5)
                        .attr('width', endPost - endGame - 5)
                        .attr('y', scaleY(lineMax))
                        .attr('height', scaleY(0) - 2)
                        .style('fill', '#707070')
                        .attr('class', function() {
                            return datetimeUnique.slice(-1) > endGameT ? 'time post click' : 'time post'
                        })
                        .attr('data-time', 'post')
                        .style('cursor', function() {
                            return datetimeUnique.slice(-1) > endGameT ? 'pointer' : 'default'
                        })

                    line.append('text')
                        .attr('x', (endPost + endGame)/2)
                        // .attr('width', startGame - startPre)
                        .attr('y', scaleY(0)/2)
                        .attr('text-anchor','middle')
                        .attr('class', function() {
                            return datetimeUnique.slice(-1) > endGameT ? 'time post linechart click' : 'time post linechart'
                        })
                        .style('fill','#eeeeee')
                        .style('cursor', function() {
                            return datetimeUnique.slice(-1) > endGameT ? 'pointer' : 'default'
                        })
                        .text('Post')

                }

                this.buildSeries = function(dataGroup) {

                    d3.selectAll('path').remove()
                    dataGroup.forEach(function(d, i) {

                        line.append('path')
                            .attr('d', lineGen(d.values))
                            .attr('stroke', color(d.values[0].group) )
                            .attr('stroke-width', 3)
                            .attr('fill', 'none')
                            .attr('line-' + d.values[0].group);
                    });

                }
            }
            var chartLine = new BuildLine()
            chartLine.initialize()

            // From https://gist.github.com/mbostock/1747543
            function cluster(alpha) {
                return function(d) {
                    var cluster = clusters[d.group];
                    if (cluster === d) return;
                    var x = d.x - cluster.x,
                        y = d.y - cluster.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + cluster.radius;

                    if (l != r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        cluster.x += x;
                        cluster.y += y;
                    }
                };
            }

            // From http://bl.ocks.org/mbostock/1804919
            function collide(alpha) {
                var quadtree = d3.geom.quadtree(outArray);
                return function(d) {
                    var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                        nx1 = d.x - r,
                        nx2 = d.x + r,
                        ny1 = d.y - r,
                        ny2 = d.y + r;
                    quadtree.visit(function(quad, x1, y1, x2, y2) {
                    if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x //d.x , //changed this change back
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.radius + quad.point.radius + (d.group === quad.point.cluster ? padding : clusterPadding);
                        if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        d.x = Math.max(d.radius, Math.min(width - d.radius, d.x))
                        d.y = Math.max(d.radius, Math.min(height - d.radius, d.y))
                        quad.point.x += x;
                        quad.point.y += y;
                        }
                    }
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                    });
                };
            }


        function nodeClick() {
                // textArray = d3.select(this).datum().text
                // console.log(textArray)
                // $('.d3-container').append($('<div></div>').attr('class','popup-bkgd').append($('<div></div>').attr('class','popup').html(textArray.join('<br/>'))))
                // $('.popup-bkgd').click(function() {
                //     $(this).remove()
                // })
        }

        function toggleGroup() {

            // var node = svg.selectAll(".node")
            var buttonId = this.id
            var button = $(this)
            var idArrayOut = []

            if (button.attr('data-active') == 'true') {

                idArray.forEach(function(d) {

                    d != buttonId ? idArrayOut.push(d) : null
                })
                idArray = idArrayOut.slice(0)
                button.attr('data-active', 'false')
                button.css('background-color', 'white')
                button.css('color', 'black')
            }
            else {
                idArray.push(parseInt(buttonId))
                button.attr('data-active', 'true')
                button.css('background-color', color(buttonId))
                button.css('color', function() {
                    return buttonId == 2 ? 'black' : 'white'
                })
            }
            buildSomething()
        }

        function buildSomething() {

            var node = svg.selectAll(".node")

            var dataGroup = d3.nest()
                .key(function(d) {
                    return d.group;
                })
                .entries(timeSeriesArray);

            var arrayFilter = function(d) {
                return idArray.indexOf(d.group) != -1
            }
            var newNodes = force.nodes().filter(arrayFilter) //this is why stuff isn't updating
            dataGroup = dataGroup.filter(function(d) {
                return idArray.indexOf(parseInt(d.key)) != -1
            })

            chartLine.buildSeries(dataGroup)

            //builds bubbles//
            node = node.data(newNodes, function(d) { return d.index;});

            node.exit().remove();

            node.enter().append('g')
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .attr('class', 'node')
            .on('click', nodeClick)
            .call(force.drag);

            node.append('circle').attr('class', 'node-circle')

            node.selectAll('.node-circle')
                .attr('r', function(d) {
                    return d.radius;
                })
                .style('fill', function(d,i) {
                    return color(d.group)
                })

            node.append('image')
                .attr('xlink:href', function(d) {

                    if (d.name.indexOf('.png') !== -1) {
                        return 'img-apple-160/' + d.name
                    }
                    else {
                        return null
                    }
                })
                .attr('width', function(d) {return d.radius + 'px'})
                .attr('height', function(d) {return d.radius + 'px'})
                .attr('x', function(d) {return -d.radius/2 + 'px'})
                .attr('y', function(d) {return -d.radius/2 + 'px'})

            node.filter(function(d){
                    return d.name.indexOf('.png') === -1
                })
                .append('text')
                .text(function(d) { return d.name;})
                .attr('width', function(d) {return d.radius + 'px'})
                .attr('height', function(d) {return d.radius + 'px'})
                .attr('x', function(d) {return 0 + 'px'})
                .attr('y', function(d) {return 5 + 'px'})
                .style('font-size', '10px')
                .attr('text-anchor', 'middle')

            force.on("tick", function(e) {

                node
                .each(cluster(10 * e.alpha * e.alpha))
                .each(collide(.1))
                .attr("transform", function(d) { return "translate(" + Math.max(d.radius, Math.min(width - d.radius, d.x)) + "," + Math.max(d.radius, Math.min(height - d.radius, d.y)) + ")"; });
            });
            force.start()
        }
        buildSomething()

        $('.button-hash').click(toggleGroup)


        function timeFilter() {

            var button = $(this)
            var time = button.attr('data-time')
            $('.time').attr('stroke','')
            $('.allday').css('background-color','white')

            time == 'all' ? button.css('background-color','rgb(0, 171, 198)') : button.attr('stroke','rgb(0, 171, 198)').attr('stroke-width','5px')

            var timeObj = {"pre": [startPreT, startGameT], "game": [startGameT, endGameT], "post": [endGameT, endPostT], "all": [startPreT, endPostT]}
            $(document).ready(function() {
                buildData(timeObj[time][0], timeObj[time][1])
                svg.selectAll(".node").remove()

                buildSomething()
            })
        }

        $('.time.click, .button.allday').click(timeFilter)


        window.addEventListener("resize", function() {

            force.stop()
            var node = svg.selectAll(".node")

            width = Math.min(Math.max(320, $('.d3-container').innerWidth()),800),
            height = $('.d3-container').innerHeight() - $('.button-container').outerHeight() - 2 * $('.chart.title').outerHeight() - 2 * $('.hbar').outerHeight() - 131,
            mult = 320/width

            force.size([width, height])

            svg
                .attr("width", width)
                .attr("height", height);

            line
                .attr('width', width)
                .attr('height', '125px')

            chartLine.initialize()
            buildSomething()

            force.on("tick", function(e) {

                node
                .each(cluster(10 * e.alpha * e.alpha))
                .each(collide(.1))
                .attr("transform", function(d) { return "translate(" + Math.max(d.radius, Math.min(width - d.radius, d.x)) + "," + Math.max(d.radius, Math.min(height - d.radius, d.y)) + ")"; });
            });
            force.start()

            $('.time.click, .button.allday').click(timeFilter)

        })


    })


}

build()
