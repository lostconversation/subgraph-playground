import React, { useState, useEffect } from "react";
import { API_KEY, SUBGRAPH_ID } from "./stuff";
import { holisticQuery } from "./holisticQuery";
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
  const [deploymentId, setDeploymentId] = useState("");
  const hasFetchedData = React.useRef(false);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      // Skip if we've already fetched the data
      if (hasFetchedData.current) return;

      try {
        // Fetch Schema
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
        if (!mounted) return;

        setRawSchema(JSON.stringify(schemaData, null, 2));
        const formatted = formatSchema(schemaData);
        setSchemaData(formatted);

        // Fetch Subgraph Name
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

        const metaResponse = await fetch(
          `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID[0].key}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: metaQuery }),
          }
        );

        const metaData = await metaResponse.json();
        if (!mounted) return;

        if (metaData?.data?._meta?.deployment) {
          setDeploymentId(metaData.data._meta.deployment);
          console.log("Deployment ID:", metaData.data._meta.deployment);
        }

        setLoading(false);
        hasFetchedData.current = true; // Set the flag after successful fetch
      } catch (err) {
        console.error("Error fetching data:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

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
        <p>Deployment ID: {deploymentId || "Loading..."}</p>
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
                  <button onClick={() => holisticQuery(setQueryResult)}>
                    holistic
                  </button>
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
