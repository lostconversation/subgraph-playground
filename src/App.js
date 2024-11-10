import React, { useState, useEffect } from "react";
import { API_KEY, SUBGRAPH_ID } from "./stuff";
import "./App.css";

const App = () => {
  const [schemaData, setSchemaData] = useState(""); // For formatted schema
  const [rawSchema, setRawSchema] = useState(""); // For raw schema data
  const [queryResult, setQueryResult] = useState(""); // Store the result of the query
  const [query, setQuery] = useState(`{
    tokens(first: 10) {
      lastPriceUSD
      name
      symbol
    }                  
  }`); // Set the default query here
  const [loading, setLoading] = useState(true);
  const [subgraphName, setSubgraphName] = useState("");

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const introspectionQuery = `
          query {
            __schema {
              queryType {
                name
              }
              types {
                name
                description
                fields {
                  name
                  description
                  type {
                    name
                    kind
                    ofType {
                      name
                      kind
                    }
                  }
                }
              }
            }
          }`;

        console.log("Fetching schema...");

        const schemaResponse = await fetch(
          `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID[0].key}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: introspectionQuery }),
          }
        );

        const schemaData = await schemaResponse.json();
        console.log("Received schema data:", schemaData);

        setRawSchema(JSON.stringify(schemaData, null, 2));

        const formatted = formatSchema(schemaData);
        console.log("Formatted schema:", formatted);

        setSchemaData(formatted);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching schema data:", err);
        setLoading(false);
      }
    };

    fetchSchema();
  }, []); // This will run only once when the component mounts

  useEffect(() => {
    fetchSubgraphName();
  }, []);

  const fetchSubgraphName = async () => {
    try {
      const metaQuery = `
        query {
          _meta {
            deployment
            block {
              number
            }
            hasIndexingErrors
          }
        }`;

      const response = await fetch(
        `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID[0].key}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: metaQuery }),
        }
      );

      const data = await response.json();
      console.log("Metadata:", data); // This will help us see what's available

      // Once we see the actual structure, we can update this line to get the correct field
      if (data?.data?._meta?.deployment) {
        setSubgraphName(data.data._meta.deployment);
      }
    } catch (err) {
      console.error("Error fetching subgraph metadata:", err);
    }
  };

  // Function to format schema with hierarchical structure
  const formatSchema = (data) => {
    const schema = data?.data?.__schema?.types || [];

    const filteredSchema = schema.filter(
      (type) => type && type.name && !type.name.startsWith("__")
    );

    return filteredSchema
      .map((type) => {
        let typeString = `${type.name}`;
        if (type.fields) {
          const sortedFields = type.fields
            .filter((field) => field && field.name)
            .sort((a, b) => {
              // If either field is 'id', handle special cases
              if (a.name === "id") return -1; // a is 'id', move it first
              if (b.name === "id") return 1; // b is 'id', move it first
              // Otherwise sort alphabetically
              return a.name.localeCompare(b.name);
            });

          const fields = sortedFields
            .map((field) => `<span>${field.name}</span>`)
            .join("\n");
          typeString += `\n${fields}`;
        }
        return typeString;
      })
      .join("\n\n");
  };

  // Handle the query execution when user clicks 'Play'
  const executeQuery = async () => {
    try {
      const response = await fetch(
        `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID[0].key}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );

      const result = await response.json();
      setQueryResult(JSON.stringify(result, null, 2)); // Display the raw result
    } catch (err) {
      console.error("Error executing query:", err);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="app">
      <h1>Subgraph Playground</h1>
      <div className="subgraph-details">
        <p>Name: {SUBGRAPH_ID[0].name}</p>
        <p>ID: {SUBGRAPH_ID[0].key}</p>
        <p>Deployment ID: {subgraphName || "Loading..."}</p>
      </div>
      <div className="tableFrame">
        <table>
          <thead>
            <tr>
              <th>Raw Schema</th>
              <th>Schema Data</th>
              <th>Query</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <pre>{rawSchema}</pre>
              </td>
              <td>
                <pre dangerouslySetInnerHTML={{ __html: schemaData }} />
              </td>
              <td>
                <textarea
                  rows="6"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    marginBottom: "10px",
                    height: "300px",
                    resize: "vertical",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "rgb(118, 173, 177)",
                  }}
                />
                <div style={{ textAlign: "center", marginTop: "10px" }}>
                  <button onClick={executeQuery}>▶️ Play</button>
                </div>
              </td>
              <td>
                <pre>{queryResult}</pre>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;
