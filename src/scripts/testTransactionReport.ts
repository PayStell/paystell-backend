import axios, { AxiosError } from "axios";

async function testTransactionReport() {
  try {
    console.log("Testing Transaction Report Endpoint");
    console.log("Note: Authentication is done via x-merchant-id header");

    // Test JSON format with date range
    console.log("\n1. Testing JSON format with date range");
    const jsonResponse = await axios.get(
      "http://localhost:3000/reports/transactions",
      {
        headers: {
          "x-merchant-id": "merchant1",
        },
        params: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        },
      },
    );

    console.log("Status:", jsonResponse.status);
    console.log("Data:", JSON.stringify(jsonResponse.data, null, 2));

    // Test CSV format
    console.log("\n2. Testing CSV format");
    const csvResponse = await axios.get(
      "http://localhost:3000/reports/transactions",
      {
        headers: {
          "x-merchant-id": "merchant1",
        },
        params: {
          format: "csv",
        },
        responseType: "text",
      },
    );

    console.log("Status:", csvResponse.status);
    console.log(
      "CSV Content (first 200 chars):",
      csvResponse.data.substring(0, 200),
    );

    // Test filtering by status
    console.log("\n3. Testing filtering by status");
    const statusResponse = await axios.get(
      "http://localhost:3000/reports/transactions",
      {
        headers: {
          "x-merchant-id": "merchant1",
        },
        params: {
          status: "success",
        },
      },
    );

    console.log("Status:", statusResponse.status);
    console.log("Data:", JSON.stringify(statusResponse.data, null, 2));

    // Test unauthorized access
    console.log("\n4. Testing unauthorized access (missing merchant ID)");
    try {
      await axios.get("http://localhost:3000/reports/transactions");
      console.log("Error: Should have thrown an unauthorized error");
    } catch (error) {
      const axiosError = error as AxiosError;
      console.log(
        "Got expected unauthorized error:",
        axiosError.response?.status,
      );
    }

    console.log("\nAll tests complete");
  } catch (error) {
    console.error("Error testing transaction report:", error);
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      console.error("Response data:", axiosError.response.data);
    }
  }
}

testTransactionReport();
