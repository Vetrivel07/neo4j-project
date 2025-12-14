let constrainViewport = false;
let currentSimulation = null;

document.querySelector( `#query-btn` ).addEventListener( `click`, () => {
  const cypher = document.querySelector('#cypher-query').value;

  // Close both side panels when running a query
  const legendPanel = document.querySelector('#legend-panel');
  const queriesPanel = document.querySelector('#queries-panel');
  if (legendPanel) legendPanel.classList.remove('open');
  if (queriesPanel) queriesPanel.classList.remove('open');

  fetch(`/graph?cypher=${cypher}`)
    .then( res => res.json() )
    .then( data => {
      const svg = d3.select(`svg`),
            width = window.innerWidth,
            height = window.innerHeight;
      
      // Clear SVG stage from previous query (if any)
      svg.selectAll( `*` ).remove();

      const NODE_RADIUS = 32;

      // Create d3.js simulation with several forces
      const simulation = d3.forceSimulation( data.nodes )
        .force( `link`, d3.forceLink( data.links ).id( d => d.id ).distance( 100 ) )
        .force( `charge`, d3.forceManyBody().strength( -500 ) )
        .force( `center`, d3.forceCenter( width / 2, height / 2 ) )
        .force('collide', d3.forceCollide(NODE_RADIUS + 8));
      currentSimulation = simulation;

      // Create relationships (edges)
      const link = svg.append( `g` )
        .selectAll( `line` )
        .data( data.links )
        .join( `line` )
        .attr( `stroke-width`, 2 );

        // Relationship labels (edge text)
      const linkLabel = svg.append('g')
        .attr('class', 'link-labels')
        .selectAll('text')
        .data(data.links)
        .join('text')
        .attr('text-anchor', 'middle')
        .style('font-size', '7px')
        .style('pointer-events', 'none')
        .style('fill', '#777')
        .text(d => d.type || d.label || d.relationship || ''); 

      // Create nodes (vertices)
      const node = svg.append( `g` )
        .selectAll( `circle` )
        .data( data.nodes )
        .join( `circle` )
        .attr('r', NODE_RADIUS)
        .attr('class', d => d.label )
        .call( drag( simulation ) );
        
        const getFullLabel = d => {
          const p = d.properties;

          if (d.label.includes('Book'))   return p.title || p.book_id || 'Book';
          if (d.label.includes('Author')) return p.name  || p.author_id || 'Author';
          if (d.label.includes('Series')) return p.title || p.name || p.series_id || 'Series';
          if (d.label.includes('Genre'))  return p.name || 'Genre';
          if (d.label.includes('User'))   return p.user_id || 'User';
          if (d.label.includes('Review')) return p.review_id || 'Review';
          if (d.label.includes('Work'))   return p.work_id || 'Work';

          return d.label;
        };

      // multiline labels inside each circle
      const MAX_CHARS_PER_LINE = 10;
      const MAX_LINES          = 3;
      const LINE_HEIGHT        = 10;

      const label = svg.append('g')
        .selectAll('text')
        .data(data.nodes)
        .join('text')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('font-size', '10px')
        .style('font-family', 'Arial, sans-serif')
        .each(function (d) {
          const full = getFullLabel(d);

          // simple word-based wrapping
          const words = full.split(/\s+/);
          const lines = [];
          let line = '';

          words.forEach(word => {
            const test = line ? `${line} ${word}` : word;
            if (test.length > MAX_CHARS_PER_LINE && line) {
              lines.push(line);
              line = word;
            } else {
              line = test;
            }
          });
          if (line) lines.push(line);

          // cap at MAX_LINES, add ellipsis if truncated
          let wrapped = lines;
          if (lines.length > MAX_LINES) {
            wrapped = lines.slice(0, MAX_LINES);
            let last = wrapped[wrapped.length - 1];
            if (!last.endsWith('…')) {
              last = last.replace(/\.?$/, '') + '…';
            }
            wrapped[wrapped.length - 1] = last;
          }

          const text = d3.select(this);
          const totalHeight = (wrapped.length - 1) * LINE_HEIGHT;

          wrapped.forEach((ln, i) => {
            text.append('tspan')
              .text(ln)
              .attr('x', 0)
              .attr('dy', i === 0 ? -totalHeight / 2 : LINE_HEIGHT);
          });
        });

      // padding from edges so circles stay fully visible
      const NODE_MARGIN = NODE_RADIUS + 20;

      // Position relationship and node elements
      simulation.on( `tick`, () => {
        
        // keep nodes inside the viewport only when focus mode is ON
        if (constrainViewport) {
          node.each(d => {
            d.x = Math.max(NODE_MARGIN, Math.min(width  - NODE_MARGIN, d.x));
            d.y = Math.max(NODE_MARGIN, Math.min(height - NODE_MARGIN, d.y));
          });
        }

        link
          .attr( `x1`, d => d.source.x )
          .attr( `y1`, d => d.source.y )
          .attr( `x2`, d => d.target.x )
          .attr( `y2`, d => d.target.y );

        node
          .attr( `cx`, d => d.x )
          .attr( `cy`, d => d.y );

        label
          .attr('transform', d => `translate(${d.x},${d.y})`);

        linkLabel.each(function (d) {
          const x1 = d.source.x, y1 = d.source.y;
          const x2 = d.target.x, y2 = d.target.y;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          let angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          if (angle > 90 || angle < -90) angle += 180;
          d3.select(this)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('transform', `translate(${mx},${my}) rotate(${angle}) translate(0,-6)`);
        });


      });

      // Handle node click-n-drag
      function drag( simulation ) {
        return d3.drag()
          .on( `start`, event => {
            if ( !event.active ) simulation.alphaTarget( 0.3 ).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on( `drag`, event => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on( `end`, event => {
            if (!event.active) simulation.alphaTarget( 0 );
            event.subject.fx = null;
            event.subject.fy = null;
          });
      }
    });
});

document.querySelector( `#cypher-query` ).addEventListener( `keyup`, event => {
  if ( event.key === `Enter` ) {
    document.querySelector( `#query-btn` ).click();
  }
});

// Toggle the side legend panel
const legendToggle = document.querySelector('#legend-toggle');
const legendPanel = document.querySelector('#legend-panel');

if (legendToggle && legendPanel) {
  legendToggle.addEventListener('click', () => {
    const isOpening = !legendPanel.classList.contains('open');
    legendPanel.classList.toggle('open', isOpening);

    // close queries if legend is opening
    if (isOpening) {
      const qp = document.querySelector('#queries-panel');
      if (qp) qp.classList.remove('open');
    }
  });
}

// Toggle Queries panel
const queriesToggle = document.querySelector('#queries-toggle');
const queriesPanel = document.querySelector('#queries-panel');
const queryInput = document.querySelector('#cypher-query');

if (queriesToggle && queriesPanel && queryInput) {
  queriesToggle.addEventListener('click', () => {
    const isOpening = !queriesPanel.classList.contains('open');
    queriesPanel.classList.toggle('open', isOpening);

    // close legend if queries is opening
    if (isOpening) {
      const lp = document.querySelector('#legend-panel');
      if (lp) lp.classList.remove('open');
    }
  });

  // click main button to load query into text box
  queriesPanel.querySelectorAll('.query-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.query-item');
      const code = item ? item.querySelector('.query-code') : null;

      let cypher;
      if (code && code.value && code.value.trim() !== '') {
        cypher = code.value;                       // use edited text
      } else {
        cypher = btn.getAttribute('data-query');   // fallback
        if (cypher) {
          const tmp = document.createElement('textarea');
          tmp.innerHTML = cypher;
          cypher = tmp.value;
        }
      }

      if (cypher) {
        queryInput.value = cypher;
      }
    });
  });


// fill code blocks from data-query and wire dropdown toggles
queriesPanel.querySelectorAll('.query-item').forEach(item => {
  const btn   = item.querySelector('.query-btn');
  const code  = item.querySelector('.query-code');
  const toggle = item.querySelector('.query-toggle');

  if (btn && code) {
    const cypher = btn.getAttribute('data-query');
    if (cypher) {
      const tmp = document.createElement('textarea');
      tmp.innerHTML = cypher;
      code.value = tmp.value;
    }
  }

  if (toggle) {
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      item.classList.toggle('open');
    });
  }
});

// Focus controls: toggle viewport constraint
const focusInBtn   = document.querySelector('#focus-in-btn');
const focusFreeBtn = document.querySelector('#focus-free-btn');

if (focusInBtn && focusFreeBtn) {
  // default visual state: Focus In active
  focusFreeBtn.classList.add('focus-active');

  focusInBtn.addEventListener('click', () => {
    constrainViewport = true;
    focusInBtn.classList.add('focus-active');
    focusFreeBtn.classList.remove('focus-active');

    // wake up simulation and pull nodes back into view
    if (currentSimulation) {
      currentSimulation.alpha(0.7).restart();
    }
  });

  focusFreeBtn.addEventListener('click', () => {
    constrainViewport = false;
    focusFreeBtn.classList.add('focus-active');
    focusInBtn.classList.remove('focus-active');

    // optionally wake sim so nodes can drift freely again
    if (currentSimulation) {
      currentSimulation.alpha(0.7).restart();
    }
  });
}

}
