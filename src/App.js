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

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const introspectionQuery = `
          query {
            __schema {
              types {
                fields {
                  name
                  type {
                    name
                    ofType {
                      name
                      ofType {
                        name
                      }
                    }
                  }
                }
              }
            }
          }`;

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
        setRawSchema(JSON.stringify(schemaData, null, 2)); // Save the raw schema JSON
        setSchemaData(formatSchema(schemaData)); // Process and save the formatted schema

        setLoading(false);
      } catch (err) {
        console.error("Error fetching schema data:", err);
        setLoading(false);
      }
    };

    fetchSchema();
  }, []); // This will run only once when the component mounts

  // Function to format schema with hierarchical structure
  const formatSchema = (data) => {
    const schema = data?.data?.__schema?.types || [];
    return schema
      .map((type) => {
        const fields = (type.fields || [])
          .map((field) => {
            let fieldString = `- ${field.name}: `;

            // Check and handle missing or undefined types
            const typeName =
              field.type.name || field.type.ofType?.name || "Not Available";
            fieldString += typeName;

            if (field.type?.ofType?.ofType?.name) {
              fieldString += `\n  ${field.type.ofType.ofType.name}`;
            }

            return fieldString;
          })
          .join("\n");
        return `${type.name}:\n${fields}`;
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
        <p>ID: {SUBGRAPH_ID[0].key}</p>
      </div>
      <div className="tableFrame">
        <table>
          <thead>
            <tr>
              <th>Schema</th>
              <th>Data Object</th>
              <th>Query</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {/* First row: Raw schema */}
            <tr>
              <td>
                <pre>{rawSchema}</pre> {/* Raw schema in Column 1 */}
              </td>
              <td>
                <pre>{schemaData}</pre> {/* Data Object in Column 2 */}
              </td>
              <td>
                {/* Third Column: Predefined query */}
                <textarea
                  rows="6"
                  value={query} // Default query value
                  onChange={(e) => setQuery(e.target.value)} // Allow user modification
                  style={{
                    width: "100%",
                    marginBottom: "10px",
                    height: "300px", // Set height to 300px
                    resize: "vertical", // Allow vertical resize only
                    backgroundColor: "rgba(0,0,0,0.3)", // Remove background color
                    color: "rgb(118, 173, 177)", // Maintain text color
                  }}
                />

                <div style={{ textAlign: "center", marginTop: "10px" }}>
                  <button onClick={executeQuery}>▶️ Play</button>
                </div>
              </td>
              <td>
                {/* Fourth Column: Raw query result */}
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
