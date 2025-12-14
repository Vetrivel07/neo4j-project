/*  
  Neo4j D3 Graph application
  Created by Dean Ganskop
  Includes contributions from Vaishak Nair
*/
/* eslint-disable no-undef */
const express = require( `express` );
const neo4j = require( `neo4j-driver` );

const app = express();
const port = 3000;

// Connect to Neo4j
const driver = neo4j.driver(
  `bolt://localhost:7687`,
  neo4j.auth.basic( `neo4j`, `student1` )
);
// Update with your Neo4j database name:
const session = driver.session( { database: `goodreads` } ); 

app.use( express.static( `public` ) );

app.get( `/graph`, async( req, res ) => {
  try {
    const query = req.query.cypher,
          nodesMap = new Map(),
          links = [];

    // Ensure the user typed in a query
    if ( !query ) {
      return;
    }

    const result = await session.run( query );

    // Process records from Neo4j
    result.records.forEach( record => {
      record.keys.forEach( key => {
        const value = record.get( key );
        
        // Skip nulls/undefined
        if ( !value ) {
          return;
        }

        processValue( value, nodesMap, links );
      });
    });

    // Special case handling for pattern queries
    if ( query.includes( `MATCH` ) && query.includes( `RETURN` ) && links.length === 0 ) {
      // Check if we need to infer relationships between nodes
      inferRelationships( result, nodesMap, links );
    }

    // Extract and return nodes as an array
    const nodes = Array.from( nodesMap.values() );
    
    console.log( `Returning ${nodes.length} nodes and ${links.length} relationships` );
    
    res.json({ 
      nodes, 
      links,
      query: query  // Include original query for reference
    });
  } 
  catch ( error ) {
    console.error( `Error executing query:`, error );
    res.status( 500 ).json({ 
      error: `Database query error: ${error.message}`,
      nodes: [],
      links: []
    });
  }
});

function processValue( value, nodesMap, links ) {
  // Node handling
  if ( neo4j.isNode( value ) ) {
    processNode( value, nodesMap );
  }
  // Relationship handling
  else if ( neo4j.isRelationship( value ) ) {
    processRelationship( value, links );
  }
  // Path handling
  else if ( neo4j.isPath( value ) ) {
    processPath( value, nodesMap, links );
  }
  // Array handling
  else if ( Array.isArray( value ) ) {
    value.forEach( item => {
      processValue( item, nodesMap, links );
    });
  }
  // Object handling
  else if ( typeof value === `object` ) {
    Object.values( value ).forEach( prop => {
      processValue( prop, nodesMap, links );
    });
  }
}

// Helper function to process a Neo4j node
function processNode( node, nodesMap ) {
  const identity = node.identity.toString();
  if ( !nodesMap.has( identity )) {
    nodesMap.set( identity, {
      id: identity,
      label: node.labels.join( ` ` ),
      properties: node.properties
    });
  }
}

// Helper function to process a Neo4j relationship
function processRelationship( rel, links ) {
  links.push({
    source: rel.start.toString(),
    target: rel.end.toString(),
    type: rel.type,
    properties: rel.properties
  });
}

// Helper function to process a Neo4j path
function processPath( path, nodesMap, links ) {
  path.segments.forEach( segment => {
    processNode( segment.start, nodesMap );
    processNode( segment.end, nodesMap );
    processRelationship( segment.relationship, links );
  });
}

// Helper function to infer relationships from pattern queries
function inferRelationships( result, nodesMap, links ) {
  // For each record
  result.records.forEach( record => {
    const recordNodes = [];
    const nodeKeys = record.keys.filter( key => {
      const value = record.get( key );
      return neo4j.isNode( value );
    });
    
    // Get all nodes in this record
    nodeKeys.forEach( key => {
      const node = record.get( key );
      recordNodes.push({
        key: key,
        node: node
      });
    });
    
    // If we have at least 2 nodes, we might have a relationship between them
    if ( recordNodes.length >= 2 ) {
      // For simplicity, just connect each node to all others in this record
      // In a real app, you'd use the Cypher pattern to determine actual relationships
      for ( let i = 0; i < recordNodes.length; i++ ) {
        for (let j = i + 1; j < recordNodes.length; j++ ) {
          const sourceNode = recordNodes[i].node;
          const targetNode = recordNodes[j].node;
          
          // Create an inferred relationship
          links.push({
            source: sourceNode.identity.toString(),
            target: targetNode.identity.toString(),
            type: `RELATED_TO`,
            inferred: true
          });
        }
      }
    }
  });
}

app.listen( port, () => {
  console.log( `Server running at http://localhost:${port}` );
});

