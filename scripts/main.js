(function () {
  var margin = {top: 15, right: 80, bottom: 35, left: 40};
  var width = 860 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var x = d3.scale.linear()
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

  var line = d3.svg.line()
      .interpolate('monotone')
      .x(function (d) { return x(d.age); })
      .y(function (d) { return y(d.ratio); });

  var line2 = d3.svg.line()
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

  var speciesData;
  var agesData;
  var agesMap;
  var totalSize;
  var selectedSpecies = [];
  var baseline;

  // d3.select('.relative-checkbox').on('change', function () {
  //   if (this.checked) {
  //     setDataType('relative');
  //     drawChart();
  //   } else {
  //     setDataType('absolute');
  //     drawChart();
  //   }
  // });

  function processData(data) {
    data = data.filter(function (d) {
      return d.year === 2009 &&
        d.age > 0 && d.age < 41 &&
        d.species.toLowerCase().indexOf('other') === -1;
    });

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

    agesMap = speciesData.reduce(function (memo, species) {
      species.ages.forEach(function (v) {
        memo[v.age] = memo[v.age] ? memo[v.age] + v.size : v.size;
      });
      return memo;
    }, {});

    agesData = _.map(agesMap, function (v, k) {
      return {
        age: k,
        size: v
      };
    });

    selectedSpecies = speciesData.map(function (d) {
      return d.species;
    });
  }

  function setDataType(type) {
    // Set ratios
    speciesData.forEach(function (species) {
      species.ages.forEach(function (age) {
        if (type === 'absolute') {
          age.ratio = age.size / species.totalSize;
        } else {
          age.ratio = (age.size / species.totalSize) - (agesMap[age.age] / totalSize);
        }
      });
    });

    agesData.forEach(function (age) {
      if (type === 'absolute') {
        age.ratio = age.size / totalSize;
      } else {
        age.ratio = 0;
      }
    });

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

  function showSelectedSpecies() {
    d3.selectAll('.species')
      .classed('faded', true)
      .classed('active', false);

    selectedSpecies.forEach(function (speciesName) {
      d3.select('.species.' + speciesName.toLowerCase())
        .classed('faded', false)
        .classed('active', true);
    });
  }

  function showAllSpecies() {
    d3.selectAll('.species')
      .classed('faded', false)
      .classed('active', false);
  }

  function mouseover(d) {
    if (d.species === 'all') {
      showAllSpecies();
    } else {
      d3.selectAll('.species')
        .classed('faded', true)
        .classed('active', false);

      d3.select('.species.' + d.species.toLowerCase())
        .classed('faded', false)
        .classed('active', true);
    }
  }

  function mouseout(d) {
    showSelectedSpecies();
  }

  function onCheckboxChange(d) {
    if (d.species === 'all') {
      selectedSpecies = speciesData.map(function (d) {
        return d.species;
      });
    } else {
      selectedSpecies = [d.species];
    }
    showSelectedSpecies();

    d3.select('.labels').selectAll('.label').classed('active', false);

    if (selectedSpecies.length === speciesData.length) {
      d3.select('.labels .label-all').classed('active', true);
    } else {
      d3.select('.label.' + d.species.toLowerCase())
        // .classed('faded', false)
        .classed('active', true);
    }
  }

  function setupChart() {
    var key = svg.append('g')
      .attr('class', 'key')
      .attr('transform', 'translate(' + (width - 125) + ', 25)');

    key.append('path')
        .attr('class', 'line')
        .attr('d', 'm0 0 h25');

    key.append('text')
      .text('Average of all')
      .attr('x', 30)
      .attr('dy', 3);

    d3.select('.labels')
      .selectAll('.label-all')
        .data([{species: 'all'}])
      .enter()
        .append('label')
        .attr('class', 'label-all')
        .html('<input type="radio" name="species" value="all"> All (' + totalSize + ')')
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        // .on('click', mouseover)
        // .select('input')
        .on('change', onCheckboxChange);

    d3.select('.label-all input').property('checked', true);

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
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        // .on('click', mouseover)
        .select('input')
        .on('change', onCheckboxChange);

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

    baseline = svg.append('g')
      .attr('class', 'total')
      .append('path')
      .attr('class', 'line');
  }

  function drawChart() {
    xAxisSVG.call(xAxis);
    yAxisSVG.transition().duration(750).call(yAxis);

    var species = svg.selectAll('.species')
      .data(speciesData);

    species.enter()
      .append('g')
        .attr('class', function (d) {
          return 'species ' + d.species.toLowerCase();
        })
      .append('path')
        .attr('class', 'line')
        .attr('d', function (d) {
          return line(d.ages);
        });

    species.select('.line')
      .transition()
      .duration(750)
      .attr('d', function (d) {
        return line(d.ages);
      });

    baseline
      .datum(agesData)
      .transition()
      .duration(750)
      .attr('d', function (d) {
        return line2(d);
      });
  }

  d3.csv('data/data.csv')
    .row(function (d) {
      return {
        year: +d.Year,
        species: d.Species.replace('Animal', ''),
        age: +d.Age,
        size: +d.SampleSize
      };
    })
    .get(function (err, data) {
      if (!err) {
        processData(data);
        setDataType('absolute');
        setupChart();
        drawChart();
      }
    });
})();
