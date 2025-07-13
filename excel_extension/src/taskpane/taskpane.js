/* global console, document, Excel, Office, signalR */

// SignalR connection
let connection = null;

Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("run").onclick = run;
    
    // Initialize SignalR connection
    initializeSignalR();
  }
});

async function initializeSignalR() {
  try {
    // Create a new SignalR connection
    connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7026/hub")
      .withAutomaticReconnect()
      .build();

    // Set up event handlers
    connection.on("ResponseElementData", function (data) {
      console.log("Data received from SignalR:", data);
      handleResponseElementDataFromSignalR(data);
    });

    connection.onreconnecting((error) => {
      console.log("SignalR connection lost due to error. Reconnecting...", error);
    });

    connection.onreconnected((connectionId) => {
      console.log("SignalR connection reestablished. Connected with connectionId:", connectionId);
    });

    connection.onclose((error) => {
      console.log("SignalR connection closed.", error);
    });

    // Start the connection
    await connection.start();
    console.log("SignalR connection started successfully.");

  } catch (error) {
    console.error("Error starting SignalR connection:", error);
  }
}

async function handleResponseElementDataFromSignalR(data) {
  try {
    await Excel.run(async (context) => {
      // Example: Insert data into the active worksheet
      const worksheet = context.workbook.worksheets.getActiveWorksheet();
      
      // You can customize this based on your data structure
      if (Array.isArray(data)) {
        // If data is an array, insert it as a table
        const range = worksheet.getCell(0, 0).getResizedRange(data.length - 1, data[0].length - 1);
        range.values = data;
      } else {
        // If data is a single value or object, insert it in the selected cell
        const range = context.workbook.getSelectedRange();
        range.values = [[JSON.stringify(data)]];
      }

      await context.sync();
      console.log("Data inserted into Excel successfully.");
    });
  } catch (error) {
    console.error("Error inserting data into Excel:", error);
  }
}

async function requestElementData(data) {
  try {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke("RequestElementData", data);
      console.log("Request sent to SignalR hub:", data);
    } else {
      console.warn("SignalR connection is not established.");
    }
  } catch (error) {
    console.error("Error sending data to SignalR hub:", error);
  }
}

async function run() {
  try {
    await Excel.run(async (context) => {
      /**
       * Insert your Excel code here
       */
      const range = context.workbook.getSelectedRange();

      // Read the range address and values
      range.load("address");
      range.load("values");

      // Update the fill color
      range.format.fill.color = "yellow";

      await context.sync();
      console.log(`The range address was ${range.address}.`);
      
      const rangeData = {
        address: range.address,
        values: range.values,
        timestamp: new Date().toISOString()
      };
      
      await requestElementData(rangeData);
    });
  } catch (error) {
    console.error(error);
  }
}
