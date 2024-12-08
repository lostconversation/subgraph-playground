import React, { useState, useEffect, useCallback } from "react";
import { API_KEY, SUBGRAPH_ID } from "./stuff";
import { holisticQuery } from "./holisticQuery";
import "./App.css";

const App = () => {
  const [schemaData, setSchemaData] = useState("");
  const [rawSchema, setRawSchema] = useState("");
  const [queryResult, setQueryResult] = useState("");
  const [query, setQuery] = useState(`{
  _meta {
    deployment
    hasIndexingErrors
    block {
      number
      timestamp
    }
  }
}`);
  const [loading, setLoading] = useState(true);
  const [deploymentId, setDeploymentId] = useState("");
  const [activeSubgraph, setActiveSubgraph] = useState(SUBGRAPH_ID[0].key);

  const executeQuery = async () => {
    try {
      const response = await fetch(
        `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${activeSubgraph}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );
      const result = await response.json();
      setQueryResult(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("Error executing query:", err);
    }
  };

  const pluralize = (typeName) => {
    if (typeName.endsWith("s")) {
      return typeName;
    }
    return typeName + "s";
  };

  const cleanFieldName = (fieldName) => {
    return fieldName.endsWith("_") ? fieldName.slice(0, -1) : fieldName;
  };

  const formatGraphQLQuery = (query) => {
    // Split the query into lines and filter out any empty lines
    const lines = query.split("\n").filter((line) => line.trim() !== "");

    // Reconstruct the query with proper indentation
    let formattedQuery = "";
    let indentLevel = 0;

    lines.forEach((line) => {
      if (line.includes("}")) {
        indentLevel -= 1;
      }

      formattedQuery += "  ".repeat(indentLevel) + line.trim() + "\n";

      if (line.includes("{")) {
        indentLevel += 1;
      }
    });

    return formattedQuery.trim();
  };

  const toggleFieldInQuery = useCallback(
    (typeName, fieldName) => {
      const lowerCaseTypeName = pluralize(
        typeName.slice(0, 2).toLowerCase() + typeName.slice(2)
      );
      const regex = new RegExp(
        `(${lowerCaseTypeName}\\s*\\{)([^}]*)(\\})`,
        "s"
      );
      const match = query.match(regex);

      const cleanedFieldName = cleanFieldName(fieldName);

      if (match) {
        const fields = match[2].split(/\s+/).filter(Boolean);
        const fieldIndex = fields.indexOf(cleanedFieldName);

        if (fieldIndex > -1) {
          fields.splice(fieldIndex, 1);
        } else {
          fields.push(cleanedFieldName);
        }

        const newFields = fields
          .sort()
          .map((field) => `  ${field}`)
          .join("\n");
        let newQuery;
        if (newFields.trim()) {
          newQuery = query.replace(regex, `$1\n${newFields}\n$3`);
        } else {
          newQuery = query.replace(regex, "");
        }
        setQuery(formatGraphQLQuery(newQuery));
      } else {
        const newQuery = query.replace(
          /\}\s*$/,
          `\n${lowerCaseTypeName} {\n  ${cleanedFieldName}\n}\n}`
        );
        setQuery(formatGraphQLQuery(newQuery));
      }
    },
    [query]
  );

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const introspectionQuery = `
          query {
            __schema {
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
          `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${activeSubgraph}`,
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
        setSchemaData(formatSchema(schemaData));

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
          `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${activeSubgraph}`,
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
        }

        setLoading(false);
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
  }, [activeSubgraph]);

  const formatSchema = (data) => {
    const schema = data?.data?.__schema?.types || [];
    const filteredSchema = schema.filter(
      (type) => type && type.name && !type.name.startsWith("__")
    );

    const typesWithIdAndContent = [];
    const typesWithContentNoId = [];
    const emptyTypes = [];

    filteredSchema.forEach((type) => {
      if (!type.fields || type.fields.length === 0) {
        emptyTypes.push(type);
      } else {
        const hasId = type.fields.some((field) => field.name === "id");
        if (hasId) {
          typesWithIdAndContent.push(type);
        } else {
          typesWithContentNoId.push(type);
        }
      }
    });

    const sortByName = (a, b) => a.name.localeCompare(b.name);
    typesWithIdAndContent.sort(sortByName);
    typesWithContentNoId.sort(sortByName);
    emptyTypes.sort(sortByName);

    const formatType = (type) => {
      let typeString = `<div class="type-header">${type.name}</div>`;
      if (type.fields) {
        const sortedFields = type.fields
          .filter((field) => field && field.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        const fields = sortedFields
          .map(
            (field) =>
              `<div class="field-container"><span class="clickable-field" onclick="window.toggleFieldInQuery('${
                type.name
              }', '${field.name}')">${
                field.name
              }</span><span class="field-description" onclick="window.toggleFieldInQuery('${
                type.name
              }', '${field.name}')">${field.description || ""}</span></div>`
          )
          .join("");
        typeString += fields;
      }
      return typeString;
    };

    return [
      ...typesWithIdAndContent.map(formatType),
      '<div class="separator">Types without ID</div>',
      ...typesWithContentNoId.map(formatType),
      '<div class="separator">Types without Fields</div>',
      ...emptyTypes.map(
        (type) => `<div class="type-header empty">${type.name}</div>`
      ),
    ].join("\n\n");
  };

  useEffect(() => {
    const fieldContainers = document.querySelectorAll(".field-container");

    fieldContainers.forEach((container) => {
      const description = container.querySelector(".field-description");
      if (description.scrollWidth > description.clientWidth) {
        description.classList.add("overflowing");
      } else {
        description.classList.remove("overflowing");
      }
    });
  }, [schemaData]);

  useEffect(() => {
    window.toggleFieldInQuery = toggleFieldInQuery;
    return () => {
      delete window.toggleFieldInQuery;
    };
  }, [toggleFieldInQuery]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="app">
      <h1>Subgraph Playground</h1>
      <div className="subgraph-details">
        <select
          className="dropdown"
          value={activeSubgraph}
          onChange={(e) => setActiveSubgraph(e.target.value)}
        >
          {SUBGRAPH_ID.map((subgraph) => (
            <option key={subgraph.key} value={subgraph.key}>
              {subgraph.name}
            </option>
          ))}
        </select>
        <p>ID: {activeSubgraph}</p>
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
              <td className="col1txt">
                <pre>{rawSchema}</pre>
              </td>
              <td className="col2txt">
                <pre dangerouslySetInnerHTML={{ __html: schemaData }} />
              </td>
              <td className="col3txt">
                <div style={{ textAlign: "left", marginTop: "10px" }}>
                  {/* <button onClick={() => holisticQuery(setQueryResult)}>
                    Holistic Search
                  </button> */}
                  <button onClick={executeQuery}>CHECK</button>
                </div>
                <textarea
                  rows="6"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    marginBottom: "10px",
                    height: "600px",
                    resize: "vertical",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "rgb(118, 173, 177)",
                  }}
                />
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
