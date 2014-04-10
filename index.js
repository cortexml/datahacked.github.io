var data, world, currentIndicator;
var btnStyles = ['default', 'primary', 'success', 'info', 'warning', 'danger']
d3.json("./data/world_data.json", function(worldMap) {
	world = worldMap
	d3.json("./data/data.json", function(json) {

		// map the indicator names
		data = json
		var names = d3.keys(data[d3.keys(data)[0]])
		names.map(function(name, i) {
			$('#step1').append($('<button type="button" class="btn btn-' + btnStyles[i] + '">' + name + '</button>').css({
				margin : '3px'
			}).click(function() {

				var self = $(this)
				self.css({
					opacity : 1
				})
				self.parent().children().filter(function(d) {
					return $(this).text() != self.text()
				}).animate({
					opacity : .3
				}, 400, function() {

				})
				// draw graph
				color = null
				currentIndicator = self.text()
				plotGraph()
			}))
		})
		/*
		 * For other functions that has to be deferred for testing
		 */

	})
})
/***********************************************
 * Graph for the first time
 **********************************************/
// draw map for the first time
// plot the world map
var margin = {
	top : 160,
	right : 100,
	bottom : 50,
	left : 50
};

var width = 900 - margin.left - margin.right;
var height = 540 - margin.bottom - margin.top;

// attach svg
var svg;
var color = null;
var projection = d3.geo.path().projection(d3.geo.mercator().translate([width / 2, height / 2]))

function plotGraph() {
	$('#graph').empty().hide()
	$('#step1-nav').hide()

	svg = d3.select("#graph").append("svg").attr({
		width : width + margin.left + margin.right,
		height : height + margin.top + margin.bottom
	}).append("g").attr({
		transform : "translate(" + margin.left + "," + margin.top + ")"
	});

	svg.selectAll('.country').data(world.features).enter().append('path').attr('d', projection).attr('class', 'country').on('click', clicked)

	// zooming purposes
	var zoom = d3.behavior.zoom().translate([50, 150]).scaleExtent([1, 6]).on("zoom", zoomed);
	function zoomed() {
		svg.style("stroke-width", 1.5 / d3.event.scale + "px");
		svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}


	svg.call(zoom.event);
	var active = d3.select(null);
	function clicked(d) {
		if (active.node() === this) {
			$('#step1-instructions-btn').fadeOut(400, function() {
				$('#step1-instructions').fadeIn(400)
			})

			return reset();
		}

		active.classed("active", false);
		active = d3.select(this).classed("active", true);

		var bounds = projection.bounds(d), dx = bounds[1][0] - bounds[0][0], dy = bounds[1][1] - bounds[0][1], x = (bounds[0][0] + bounds[1][0]) / 2, y = (bounds[0][1] + bounds[1][1]) / 2, scale = .9 / Math.max(dx / width, dy / height), translate = [width / 2 - scale * x, height / 2 - scale * y];
		svg.transition().duration(750).call(zoom.translate(translate).scale(scale).event);

		$('#step1-instructions').fadeOut(400, function() {
			$('#step1-instructions-btn').find('button').text('Predict ' + currentIndicator + " for " + d.properties.name).click(function() {
				return setupEquation(currentIndicator, d.id, d.properties.name)
			})
			$('#step1-instructions-btn').fadeIn(400)

		})
	}

	function reset() {
		active.classed("active", false);
		active = d3.select(null);
		svg.transition().duration(750).call(zoom.translate([50, 150]).scale(1).event);
	}

	flashInstructions()
	graph();
}

// tooltip
var tooltip = d3.select("body").append("div").style("position", "absolute").style("z-index", "10").style("visibility", "hidden").style({
	'background-color' : 'rgba(0, 0, 0, 0.9)',
	'border-radius' : '4px',
	'padding' : '5px',
	'font-size' : '12px'
});
function graph() {

	// fill map
	if (color == null) {
		var min = d3.min(d3.keys(data), function(country) {
			return d3.min(d3.keys(data[country][currentIndicator]), function(date) {
				return data[country][currentIndicator][date]
			})
		})
		var max = d3.max(d3.keys(data), function(country) {
			return d3.max(d3.keys(data[country][currentIndicator]), function(date) {
				return data[country][currentIndicator][date]
			})
		})
		color = d3.scale.linear().domain([min, max]).range(['#deebf7', '#3182bd'])
	}

	if (!$("#slider").is(':visible')) {
		$("#slider").slider({
			min : 1990,
			max : 2013,
			step : 1,
			slide : function(event, ui) {
				$('#slider-value').text(ui.value)
				graph()
			}
		})
	}

	var slider = $("#slider")
	var filledCountries = svg.selectAll('.country').style('fill', function(country) {
		if (data[country.id] != null) {
			return color(data[country.id][currentIndicator][slider.slider('value')])
		}
	}).filter(function(country) {
		return data[country.id] != null
	})
	// tooltip
	function recolor() {
		filledCountries.style('fill', function(country) {
			if (isNaN(data[country.id][currentIndicator][slider.slider('value')])) {
				return '#000000'
			} else {
				return color(data[country.id][currentIndicator][slider.slider('value')])
			}

		})
	}


	filledCountries.on("mouseover", function(d) {
		d3.select(this).style('fill', 'pink')
		return tooltip.text(d.properties.name + " : " + data[d.id][currentIndicator][slider.slider('value')]).style("visibility", "visible");
	}).on("mousemove", function() {
		return tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
	}).on("mouseout", function() {
		recolor();
		return tooltip.style("visibility", "hidden");
	})

	$('#step1-nav').slideDown(800, function() {
		if (!$('#graph').is(':visible')) {
			$('#graph').fadeIn(400)
		}
	})
	// $('#slider').slider('value', 2001).call($('#slider'));

}

// controller button
var play = true
$('#controller-btn').click(function() {

	if ($(this).text().trim() == 'Play') {
		$(this).text('Pause')
		play = true;
		animateGraph();
	} else {
		play = false;
		$(this).text('Play')
	}
})
function animateGraph() {
	if (play) {
		var slider = $('#slider')
		var value = slider.slider('value') + 1
		if (value > 2013) {
			value = value - 2013 + 1990
		}
		$('#slider-value').text(value)
		slider.slider('value', value)
		graph()

		setTimeout(animateGraph, 300)
	}
}

/***********************************************
 * Step 1 nav bar
 **********************************************/

function flashInstructions() {
	$('#step1-instructions').parent().toggleClass('active')
	setTimeout(flashInstructions, 1000)
}

/***********************************************
 * Step 2
 **********************************************/

/***********************************************
 * Line Graph
 **********************************************/
function plotLine(data) {
	//set the margins
	var margin = {
		top : 50,
		right : 160,
		bottom : 80,
		left : 50
	}, width = 900 - margin.left - margin.right, height = 400 - margin.top - margin.bottom;

	// set the type of number here, n is a number with a comma, .2% will get you a percent, .2f will get you 2 decimal points
	var NumbType = d3.format(".2f");

	// color array
	var colorscale1 = ["#6A90C1", "#E20E03"];

	//color function pulls from array of colors stored in color.js
	var color = d3.scale.ordinal().range(colorscale1);

	//define the approx. number of x scale ticks
	var xscaleticks = 5;

	//defines a function to be used to append the title to the tooltip.  you can set how you want it to display here.
	var maketip = function(d) {
		var tip = '<p class="tip3">' + d.name + '<p class="tip1">' + NumbType(d.value) + '</p> <p class="tip3">' + formatDate(d.date) + '</p>';
		return tip;
	}
	//define your year format here, first for the x scale, then if the date is displayed in tooltips
	var parseDate = d3.time.format("%m/%d/%Y").parse;
	var formatDate = d3.time.format("%b %d, '%y");

	// clip path
	$('#line').empty()
	var svg = d3.select("#line").append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	svg.append("svg:rect").attr("width", width).attr("height", height).attr("class", "plot");
	var clip = svg.append("svg:clipPath").attr("id", "clip").append("svg:rect").attr("x", 0).attr("y", 0).attr("width", width).attr("height", height);

	// force data to update when menu is changed
	var menu = d3.select("#menu select").on("change", change);

	redraw(data);

	// return the redraw function for callback later
	return change

	// when a new economic indicator is chosen
	function change(newData) {
		data = newData
		d3.transition().duration(1500).each(redraw);
	}

	// redraw
	function redraw() {

		// for object constancy we will need to set "keys", one for each type of data (column name) exclude all others.
		color.domain(d3.keys(data[0]).filter(function(key) {
			return (key !== "date" && key !== "type");
		}));

		var linedata = color.domain().map(function(name) {
			return {
				name : name,
				values : data.map(function(d) {
					return {
						name : name,
						date : parseDate(d.date),
						value : parseFloat(d[name], 10)
					};
				})
			};
		});

		//make an empty variable to stash the last values into so i can sort the legend
		var lastvalues = [];

		//setup the x and y scales
		var x = d3.time.scale().domain([d3.min(linedata, function(c) {
			return d3.min(c.values, function(v) {
				return v.date;
			});
		}), d3.max(linedata, function(c) {
			return d3.max(c.values, function(v) {
				return v.date;
			});
		})]).range([0, width]);

		var y = d3.scale.linear().domain([d3.min(linedata, function(c) {
			return d3.min(c.values, function(v) {
				return v.value;
			});
		}), d3.max(linedata, function(c) {
			return d3.max(c.values, function(v) {
				return v.value;
			});
		})]).range([height, 0]);

		//will draw the line
		var line = d3.svg.line().x(function(d) {
			return x(d.date);
		}).y(function(d) {
			return y(d.value);
		});

		//define the zoom
		var zoom = d3.behavior.zoom().x(x).y(y).scaleExtent([.5, 8]).on("zoom", zoomed);

		//call the zoom on the SVG
		svg.call(zoom);

		//create and draw the x axis
		var xAxis = d3.svg.axis().scale(x).orient("bottom").tickPadding(8).ticks(xscaleticks);

		svg.append("svg:g").attr("class", "x axis");

		//create and draw the y axis
		var yAxis = d3.svg.axis().scale(y).orient("left").tickSize(0 - width).tickPadding(8).ticks(6);

		svg.append("svg:g").attr("class", "y axis");

		//bind the data
		var thegraph = svg.selectAll(".thegraph").data(linedata)

		//append a g tag for each line and set of tooltip circles and give it a unique ID based on the column name of the data
		var thegraphEnter = thegraph.enter().append("g").attr("clip-path", "url(#clip)").attr("class", "thegraph").attr('id', function(d) {
			return d.name + "-line";
		}).style("stroke-width", 2.5).on("mouseover", function(d) {
			d3.select(this)//on mouseover of each line, give it a nice thick stroke
			.style("stroke-width", '6px');

			var selectthegraphs = $('.thegraph').not(this);
			//select all the rest of the lines, except the one you are hovering on and drop their opacity
			d3.selectAll(selectthegraphs).style("opacity", 0.2);

			var getname = document.getElementById(d.name);
			//use get element cause the ID names have spaces in them
			var selectlegend = $('.legend').not(getname);
			//grab all the legend items that match the line you are on, except the one you are hovering on

			d3.selectAll(selectlegend)// drop opacity on other legend names
			.style("opacity", .2);

			d3.select(getname).attr("class", "legend-select");
			//change the class on the legend name that corresponds to hovered line to be bolder
		}).on("mouseout", function(d) {//undo everything on the mouseout
			d3.select(this).style("stroke-width", '2.5px');

			var selectthegraphs = $('.thegraph').not(this);
			d3.selectAll(selectthegraphs).style("opacity", 1);

			var getname = document.getElementById(d.name);
			var getname2 = $('.legend[fakeclass="fakelegend"]')
			var selectlegend = $('.legend').not(getname2).not(getname);

			d3.selectAll(selectlegend).style("opacity", 1);

			d3.select(getname).attr("class", "legend");
		});

		//actually append the line to the graph
		thegraphEnter.append("path").attr("class", "line").style("stroke", function(d) {
			return color(d.name);
		}).attr("d", function(d) {
			return line(d.values[0]);
		}).transition().duration(2000).attrTween('d', function(d) {
			var interpolate = d3.scale.quantile().domain([0, 1]).range(d3.range(1, d.values.length + 1));
			return function(t) {
				return line(d.values.slice(0, interpolate(t)));
			};
		});

		//then append some 'nearly' invisible circles at each data point
		thegraph.selectAll("circle").data(function(d) {
			return (d.values);
		}).enter().append("circle").attr("class", "tipcircle").attr("cx", function(d, i) {
			return x(d.date)
		}).attr("cy", function(d, i) {
			return y(d.value)
		}).attr("r", 12).style('opacity', 1e-6).attr("title", maketip);

		//append the legend
		var legend = svg.selectAll('.legend').data(linedata);

		var legendEnter = legend.enter().append('g').attr('class', 'legend').attr('id', function(d) {
			return d.name;
		}).on('click', function(d) {//onclick function to toggle off the lines
			if ($(this).css("opacity") == 1) {//uses the opacity of the item clicked on to determine whether to turn the line on or off

				var elemented = document.getElementById(this.id + "-line");
				//grab the line that has the same ID as this point along w/ "-line"  use get element cause ID has spaces
				d3.select(elemented).transition().duration(1000).style("opacity", 0).style("display", 'none');

				d3.select(this).attr('fakeclass', 'fakelegend').transition().duration(1000).style("opacity", .2);
			} else {

				var elemented = document.getElementById(this.id + "-line");
				d3.select(elemented).style("display", "block").transition().duration(1000).style("opacity", 1);

				d3.select(this).attr('fakeclass', 'legend').transition().duration(1000).style("opacity", 1);
			}
		});

		//create a scale to pass the legend items through
		var legendscale = d3.scale.ordinal().domain(lastvalues).range([0, 30, 60, 90, 120, 150, 180, 210]);

		//actually add the circles to the created legend container
		legendEnter.append('circle').attr('cx', width + 20).attr('cy', function(d) {
			return legendscale(d.values[d.values.length - 1].value);
		}).attr('r', 7).style('fill', function(d) {
			return color(d.name);
		});

		//add the legend text
		legendEnter.append('text').attr('x', width + 35).attr('y', function(d) {
			return legendscale(d.values[d.values.length - 1].value);
		}).text(function(d) {
			return d.name;
		});

		// set variable for updating visualization
		var thegraphUpdate = d3.transition(thegraph);

		// change values of path and then the circles to those of the new series
		thegraphUpdate.select("path").attr("d", function(d, i) {

			//must be a better place to put this, but this works for now
			lastvalues[i] = d.values[d.values.length - 1].value;
			lastvalues.sort(function(a, b) {
				return b - a
			});
			legendscale.domain(lastvalues);

			return line(d.values);
		});

		thegraphUpdate.selectAll("circle").attr("title", maketip).attr("cy", function(d, i) {
			return y(d.value)
		}).attr("cx", function(d, i) {
			return x(d.date)
		});

		// and now for legend items
		var legendUpdate = d3.transition(legend);

		legendUpdate.select("circle").attr('cy', function(d, i) {
			return legendscale(d.values[d.values.length - 1].value);
		});

		legendUpdate.select("text").attr('y', function(d) {
			return legendscale(d.values[d.values.length - 1].value);
		});

		// update the axes,
		d3.transition(svg).select(".y.axis").call(yAxis);

		d3.transition(svg).select(".x.axis").attr("transform", "translate(0," + height + ")").call(xAxis);

		//make my tooltips work
		$('circle').tipsy({
			opacity : .9,
			gravity : 'n',
			html : true
		});

		//define the zoom function
		function zoomed() {

			svg.select(".x.axis").call(xAxis);
			svg.select(".y.axis").call(yAxis);

			svg.selectAll(".tipcircle").attr("cx", function(d, i) {
				return x(d.date)
			}).attr("cy", function(d, i) {
				return y(d.value)
			});

			svg.selectAll(".line").attr("class", "line").attr("d", function(d) {
				return line(d.values)
			});
		}

		// for debugging
		return 'redraw done'

	}

}

/***********************************************
 * Equation
 **********************************************/
function setupEquation(indicator, country, countryName) {
	// reset div
	$("#equation").empty()
	$('#equation-title').empty()

	$('#step2').show()
	// console.log('hi')

	// get names
	var names = d3.keys(data[d3.keys(data)[0]])
	names.map(function(name, i) {
		if (name != indicator) {
			// put colors
			if (i != 5) {
				$("#equation").append('<td><input type="text" class="form-control equation" placeholder="1.0"></td><td><h5><span class="label label-' + btnStyles[i] + '">' + name + '</span> + </h5></td>')
			} else {
				$("#equation").append('<td><input type="text" class="form-control equation" placeholder="1.0"></td><td><h5><span class="label label-' + btnStyles[i] + '">' + name + '</span></h5></td>')
			}

		}
	})

	$('#equation-title').html("Predicted " + indicator + " for " + countryName + " = ")

	// plot line graph
	var current = data[country][indicator]
	formatted = d3.keys(current).map(function(d) {
		return {
			date : '12/31/' + d,
			'Actual Value' : current[d]
		}
	})
	var redraw = plotLine(formatted)
	changeEquation();

	// scroll to section 2
	$('html, body').animate({
		scrollTop : 930
	}, 700);

	// on change
	$("#equation").find('input').change(changeEquation)

	var prev = ""
	function changeEquation() {
		var value = {}
		subData = data[country]
		$("#equation").find('td').each(function(i) {
			var val = $(this).find('input').val()
			if (val == "") {
				val = 1.0
			}
			var name = $(this).find('span').text()

			if (name.trim() == "") {
				console.log(val)
				var tmp = subData[prev]
				d3.keys(tmp).map(function(k) {
					value[k] = (value[k] == null ? val * tmp[k] : val * tmp[k] + value[k])
				})
			} else {
				prev = name.trim()
			}
		})
		// change data format
		formatted.map(function(obj) {
			year = obj.date.substring(6, 10)
			obj['Predicted Value'] = value[year]
		})
		redraw(formatted)
	}

	// action for submitting prediction model
	$('#submit-model').click(function() {
		// calculate RMS
		var pctErr = 0;
		formatted.map(function(obj) {
			pctErr += Math.abs((obj['Predicted Value'] - obj['Actual Value']) / obj['Actual Value']) * 100
		})
		pctErr = parseInt(pctErr / formatted.length)
		$('#error').html(pctErr + "%")
		$('#step3').show()

		// console.log(pctErr)
		// scroll to section 2
		$('html, body').animate({
			scrollTop : 2000
		}, 700);
	})
}

/***********************************************
 * Instructions Page
 **********************************************/
$('img').click(function() {
	$('#instructions').fadeOut(400, function() {
		$('#banner').fadeIn(600)
	})
})
