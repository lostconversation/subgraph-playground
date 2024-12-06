import { API_KEY, SUBGRAPH_ID } from "./stuff";

const holisticQuery = async (setQueryResult) => {
  try {
    // Fetch the schema to get all types and fields
    const introspectionQuery = `
        query {
          __schema {
            types {
              name
              fields {
                name
                args {
                  name
                  type {
                    kind
                    name
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
    const types = schemaData?.data?.__schema?.types || [];

    // Construct a query for a specific type (e.g., "Query")
    const queryType = types.find((type) => type.name === "Query");
    if (!queryType) {
      console.error("Query type not found in schema");
      return;
    }

    // Filter out fields that require arguments
    const fields = queryType.fields
      .filter((field) => field.args.length === 0)
      .map((field) => field.name);

    // Log the fields to verify they are being collected
    console.log("Fields collected for query:", fields);

    if (fields.length === 0) {
      console.error("No fields available for the query");
      return;
    }

    const holisticQuery = `{ ${fields.join(" ")} }`;

    // Log the constructed query to verify its structure
    console.log("Constructed Holistic Query:", holisticQuery);

    // Execute the holistic query
    const response = await fetch(
      `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID[0].key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: holisticQuery }),
      }
    );

    const result = await response.json();
    console.log("Holistic Query Result:", result);

    // Filter out empty fields from the result
    const filteredResult = JSON.stringify(
      result,
      (key, value) => {
        if (
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return undefined;
        }
        return value;
      },
      2
    );

    setQueryResult(filteredResult);
  } catch (err) {
    console.error("Error executing holistic query:", err);
  }
};

export { holisticQuery };
