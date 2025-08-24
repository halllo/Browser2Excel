/* global console, document, Excel, Office, signalR */

import { Transaction, RawTransaction, Response } from './parser.js';

let connection = null;

Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("run").onclick = run;

    const tableBody = document.getElementById('data-table-body');
    tableBody.addEventListener('click', function (e) {
        let row = e.target.closest('tr');
        if (row && row.parentNode === tableBody) {
            onTableRowClicked(row);
        }
    });
    
    initializeSignalR();
  }
});

async function initializeSignalR() {
  try {
    connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:7026/hub")
      .withAutomaticReconnect()
      .build();

    connection.on("ResponseElementData", function (data) {
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

    await connection.start();
    console.log("SignalR connection started successfully.");

  } catch (error) {
    console.error("Error starting SignalR connection:", error);
  }
}

async function run() {
  try {
    await Excel.run(async (context) => {
      // Read the range address and values
      const range = context.workbook.getSelectedRange();
      range.load("address");
      range.load("values");
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

async function handleResponseElementDataFromSignalR(data) {
  try {
    console.log("Processing received data:", data);
    clearTransactionTable();

    const response = new Response(data.url, data.elements.map(element => new RawTransaction(element.id, element.content, element.date, element.arialabel)));
    const parsedTransactions = response.display();
    parsedTransactions.forEach(transaction => {
      addTransactionRow(transaction.id, transaction.description, transaction.kind, transaction.frequency, transaction.date, transaction.amount);
    });

  } catch (error) {
    console.error("Error processing received data:", error);
  }
}

function addTransactionRow(id, description, kind, frequency, date, amount) {
  const tableBody = document.getElementById("data-table-body");
  
  // Create a new row
  const row = document.createElement("tr");
  row.className = "ms-Table-row";
  row.id = "transaction_" + id;

  // Create cells
  const idCell = document.createElement("td");
  idCell.className = "ms-Table-cell";
  idCell.textContent = id || '';
  row.appendChild(idCell);
    
  const descriptionCell = document.createElement("td");
  descriptionCell.className = "ms-Table-cell";
  descriptionCell.textContent = description || '';
  row.appendChild(descriptionCell);
  
  const kindCell = document.createElement("td");
  kindCell.className = "ms-Table-cell";
  kindCell.textContent = kind || '';
  row.appendChild(kindCell);
  
  const frequencyCell = document.createElement("td");
  frequencyCell.className = "ms-Table-cell";
  frequencyCell.textContent = frequency || '';
  row.appendChild(frequencyCell);
  
  const dateCell = document.createElement("td");
  dateCell.className = "ms-Table-cell";
  dateCell.textContent = date || '';
  row.appendChild(dateCell);
  
  const amountCell = document.createElement("td");
  amountCell.className = "ms-Table-cell";
  amountCell.textContent = (typeof amount === 'number' ? amount : parseFloat(amount)).toFixed(2);
  row.appendChild(amountCell);
  
  // Add row to the table body
  tableBody.appendChild(row);
}

function clearTransactionTable() {
  const tableBody = document.getElementById("data-table-body");
  tableBody.innerHTML = "";
}

async function onTableRowClicked(row) {
  try {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      console.info('row clicked', row);
      const idMatch = row.id.match(/^transaction_(.+)$/);
      const data = { cardId: idMatch ? idMatch[1] : row.id };
      await connection.invoke("Highlight", data);
      console.log("Request sent to SignalR hub:", data);
    } else {
      console.warn("SignalR connection is not established.");
    }
  } catch (error) {
    console.error("Error sending data to SignalR hub:", error);
  }
}