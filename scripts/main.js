(function () {
  var speciesData;
  var agesData;
  var agesMap;
  var totalSize;
  var selectedSpecies = [];

  var margin = {top: 15, right: 80, bottom: 35, left: 40};
  var width = 860 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var x = d3.scale
      .linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom');

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient('left')
      .tickFormat(d3.format('.0%'));

  var speciesLine = d3.svg.line()
      .interpolate('monotone')
      .x(function (d) { return x(d.age); })
      .y(function (d) { return y(d.ratio); });

  var averageLine = d3.svg.line()
      .interpolate('monotone')
      .x(function (d) { return x(d.age); })
      .y(function (d) { return y(d.ratio); });

  var svg = d3.select('.chart').append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var xAxisSVG = svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')');

  xAxisSVG.append('text')
      .attr('y', 30)
      .attr('x', 418)
      .text('Age');

  var yAxisSVG = svg.append('g')
      .attr('class', 'y axis');

  yAxisSVG.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('Responses');

  var averageLineSVG = svg.append('g')
      .attr('class', 'total')
    .append('path')
      .attr('class', 'line');

  var key = svg.append('g')
      .attr('class', 'key')
      .attr('transform', 'translate(' + (width - 230) + ', 25)');

  var keyAll = key.append('g')
      .attr('class', 'key-all');

  keyAll.append('path')
      .attr('class', 'line')
      .attr('d', 'm0 0 h25');

  keyAll.append('text')
      .text('All species')
      .attr('x', 30)
      .attr('y', 3);

  var keySpecies = key.append('g')
      .attr('class', 'key-species');

  keySpecies.append('path')
      .attr('class', 'line')
      .attr('d', 'm0 22 h25');

  keySpecies.append('text')
      .text('All species')
      .attr('x', 30)
      .attr('y', 25);

  keySpecies.attr('visibility', 'hidden');

  // The "relative" checkbox
  d3.select('body')
    .append('label')
      .attr('class', 'relative-checkbox')
      .html('<input type="checkbox"> Relative')
    .select('input')
      .on('change', function () {
        if (this.checked) {
          setDataType('relative');
          drawChart();
        } else {
          setDataType('absolute');
          drawChart();
        }
      });

  function processData(data) {
    // Firstly filter out irregular data we don't want
    data = data.filter(function (d) {
      return d.year === 2009 &&
        d.age > 0 && d.age < 41 &&
        d.species.toLowerCase().indexOf('other') === -1;
    });

    // We want to restructute the data to suit d3. This primarily involves grouping it by species
    // allowing d3 to easily draw a line for each species.
    speciesData = _(data)
      .groupBy('species')
      .map(function (data, speciesName) {
        return {
          species: speciesName,
          ages: _.sortBy(data, 'age'),
          totalSize: _.sum(data, 'size')
        };
      })
      .sortByOrder(['totalSize'], ['desc'])
      .slice(0, 20)
      .value();

    totalSize = _.sum(speciesData, 'totalSize');

    // The agesMap is a kvp of age to total species, this is used as a quick lookup when computing.
    agesMap = speciesData.reduce(function (memo, species) {
      species.ages.forEach(function (v) {
        memo[v.age] = memo[v.age] ? memo[v.age] + v.size : v.size;
      });
      return memo;
    }, {});

    // Data used to draw the red average baseline in the chart
    agesData = _.map(agesMap, function (v, k) {
      return {
        age: +k,
        size: v
      };
    });

    // The selected species (ie. highlighted lines). By default we select all species.
    selectedSpecies = _.clone(speciesData);
  }

  function getAverageAge(ageData) {
    var agesSum = 0;
    var sizeSum = 0;
    ageData.forEach(function (d) {
      agesSum += d.age * d.size;
      sizeSum += d.size;
    });
    return agesSum / sizeSum;
  }

  function setDataType(type) {
    // Set ratios for each age depending on the type ('absolute' or 'relative')
    speciesData.forEach(function (species) {
      species.ages.forEach(function (age) {
        if (type === 'absolute') {
          age.ratio = age.size / species.totalSize;
        } else {
          age.ratio = (age.size / species.totalSize) - (agesMap[age.age] / totalSize);
        }
      });
    });

    // Also set the ratios for the average age array, for the relative chart we just
    // set the ratio to 0 so the line is straight
    agesData.forEach(function (age) {
      if (type === 'absolute') {
        age.ratio = age.size / totalSize;
      } else {
        age.ratio = 0;
      }
    });

    // Update the domains to reflect the new ranges of values
    x.domain([
      d3.min(speciesData, function (d) {
        return d3.min(d.ages, function (v) {
          return v.age;
        });
      }),
      d3.max(speciesData, function (d) {
        return d3.max(d.ages, function (v) {
          return v.age;
        });
      })
    ]);

    var yMin = d3.min(speciesData, function (d) {
      return d3.min(d.ages, function (v) {
        return v.ratio;
      });
    });

    var yMax = d3.max(speciesData, function (d) {
      return d3.max(d.ages, function (v) {
        return v.ratio;
      });
    });

    if (type === 'relative') {
      yMin = -Math.max(Math.abs(yMin), Math.abs(yMax));
      yMax = Math.max(Math.abs(yMin), Math.abs(yMax));
    }

    y.domain([yMin, yMax]);
  }

  function highlightSpecies(species) {
    // Fade all species lines out
    d3.selectAll('.species')
      .classed('faded', true)
      .classed('active', false);

    // Highlight the selected lines
    species.forEach(function (d) {
      d3.select('.species.' + d.species.toLowerCase())
        .classed('faded', false)
        .classed('active', true);
    });
  }

  function highlightSpeciesButton(species) {
    // Unselect all species buttons
    d3.select('.labels').selectAll('.label')
      .classed('active', false);

    // If all species are selected then highlight the "All" button
    // otherwise highlight the specific species button
    if (species.length === speciesData.length) {
      d3.select('.labels .label-all').classed('active', true);
    } else {
      species.forEach(function (d) {
        d3.select('.label.' + d.species.toLowerCase())
          .classed('active', true);
      });
    }
  }

  function updateKey(species) {
    keyAll.select('text').text('Average of all (average age ' + getAverageAge(agesData).toFixed(2) + ')');

    if (species.length === speciesData.length) {
      keySpecies.select('text').text('All species (average age ' + getAverageAge(agesData).toFixed(2) + ')');
      keySpecies.attr('visibility', 'visible');
    } else {
      keySpecies.select('text').text(species[0].species.replace('-', ' ') + ' (average age ' + getAverageAge(species[0].ages).toFixed(2) + ')');
      keySpecies.attr('visibility', 'visible');
    }
  }

  function addSpeciesButtons() {
    // The "All" button. We create a fake species with a name of "all" to fudge
    // this behaviour into the rest of the chart
    d3.select('.labels')
      .selectAll('.label-all')
        .data([{species: 'all'}])
      .enter()
        .append('label')
        .attr('class', 'label-all')
        .html('<input type="radio" name="species" value="all"> All (' + totalSize + ')')
        .on('mouseover', onSpeciesButtonOver)
        .on('mouseout', onSpeciesButtonOut)
      .select('input')
        .on('change', onSpeciesButtonChange)
        .property('checked', true);

    // Create the labels for each of the species
    d3.select('.labels')
      .selectAll('.label')
        .data(speciesData)
      .enter()
        .append('label')
        .attr('class', function (d) {
          return 'label ' + d.species.toLowerCase();
        })
        .html(function (d) {
          return '<input type="radio" name="species" value="' + d.species + '"> ' + d.species.replace('-', ' ') + ' (' + d.totalSize + ')';
        })
        .on('mouseover', onSpeciesButtonOver)
        .on('mouseout', onSpeciesButtonOut)
      .select('input')
        .on('change', onSpeciesButtonChange);
  }

  function onSpeciesButtonOver(d) {
    var speciesToHighlight;
    if (d.species === 'all') {
      speciesToHighlight = _.clone(speciesData);
    } else {
      speciesToHighlight = [d];
    }
    highlightSpecies(speciesToHighlight);
    updateKey(speciesToHighlight);
  }

  function onSpeciesButtonOut(d) {
    highlightSpecies(selectedSpecies);
    updateKey(selectedSpecies);
  }

  function onSpeciesButtonChange(d) {
    if (d.species === 'all') {
      selectedSpecies = _.clone(speciesData);
    } else {
      selectedSpecies = [d];
    }
    highlightSpecies(selectedSpecies);
    highlightSpeciesButton(selectedSpecies);
    updateKey(selectedSpecies);
  }

  function drawChart() {
    xAxisSVG.call(xAxis);
    yAxisSVG.transition().duration(750).call(yAxis);

    // Select
    var species = svg.selectAll('.species')
      .data(speciesData);

    // Enter
    species.enter()
      .append('g')
        .attr('class', function (d) {
          return 'species ' + d.species.toLowerCase();
        })
      .append('path')
        .attr('class', 'line')
        .attr('d', function (d) {
          return speciesLine(d.ages);
        });
        // .on('mouseover', onSpeciesButtonOver)
        // .on('mouseout', onSpeciesButtonOut);

    // Update
    species.select('.line')
      .transition()
      .duration(750)
      .attr('d', function (d) {
        return speciesLine(d.ages);
      });

    averageLineSVG
      .datum(agesData)
      .transition()
      .duration(750)
      .attr('d', function (d) {
        return averageLine(d);
      });
  }

  // Load species data
  d3.csv('data/data.csv')
    .row(function (d) {
      // Format data
      return {
        year: +d.Year,
        species: d.Species.replace('Animal', ''),
        age: +d.Age,
        size: +d.SampleSize
      };
    })
    .get(function (err, data) {
      // On success
      if (!err) {
        processData(data);
        setDataType('absolute');
        addSpeciesButtons();
        updateKey(selectedSpecies);
        drawChart();
      }
    });
})();
