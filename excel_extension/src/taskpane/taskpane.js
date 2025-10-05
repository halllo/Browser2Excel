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
  
  // Create action button cell
  const actionCell = document.createElement("td");
  actionCell.className = "ms-Table-cell";
  
  const addButton = document.createElement("button");
  addButton.className = "ms-Button ms-Button--primary";
  addButton.textContent = "Add";
  addButton.onclick = function(e) {
    e.stopPropagation(); // Prevent row click event
    addTransactionToExcel(id, description, kind, frequency, date, amount);
  };
  
  actionCell.appendChild(addButton);
  row.appendChild(actionCell);
  
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

async function addTransactionToExcel(id, description, kind, frequency, date, amount) {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      // Find the table on the sheet and add a new row with the transaction data
      const tables = sheet.tables;
      tables.load("items/name");
      await context.sync();

      let table = null;
      if (tables.items.length > 0) {
        table = tables.items[0]; // Use the first table found
      }

      if (table) {
        // Get the column names of the table
        table.columns.load("items/name");
        await context.sync();
        const columnNames = table.columns.items.map(col => col.name);
        console.debug("Table columns:", columnNames);

        // Find the correct index to insert the new data, based on the date column
        const dateColumnIndex = columnNames.indexOf("Datum");
        console.debug("Date column index:", dateColumnIndex);

        if (dateColumnIndex === -1) {
          console.error("Date column not found in the table.");
          return;
        }

        // Fetch existing rows to determine the correct insertion point
        table.rows.load("items");
        await context.sync();
        const existingRows = table.rows.items;
        let insertIndex = existingRows.length; // Default to appending at the end

        for (let i = 0; i < existingRows.length; i++) {
          const row = existingRows[i];
          row.load("values");
          await context.sync();
          const rowDateValue = row.values[0][dateColumnIndex];
          if (rowDateValue && dateToExcelSerial(rowDateValue) > dateToExcelSerial(date)) {
            insertIndex = i;
            break;
          }
        }
        console.debug("Inserting new row at index:", insertIndex);

        // Create a mapping of column names to values
        const valueMap = {
          "Ausgaben": description || '',
          "Art": kind || '',
          "Häufigkeit": frequency || '',
          "Datum": dateToExcelSerial(date),
          "Betrag": (typeof amount === 'number' ? amount : parseFloat(amount)) || 0
        };
        
        // Map column names to their corresponding values
        console.debug("New row values:", valueMap);
        const rowValues = columnNames.map(colName => valueMap[colName] ?? null );
        
        // Add a new row to the table
        table.rows.add(insertIndex, [rowValues]);
        await context.sync();
        console.info("Transaction added to Excel table:", insertIndex, rowValues);
      } else {
        console.warn("No table found on the active worksheet.");
      }
    });
  } catch (error) {
    console.error("Error adding transaction to Excel:", error);
  }
}

/**
 * Convert a date string to Excel serial number
 * Excel serial dates are the number of days since January 1, 1900
 * @param {string|number} dateString - Date string in format dd/MM/yyyy or Excel serial number
 * @returns {number|string} Excel serial number or empty string if invalid
 */
function dateToExcelSerial(dateString) {
  if (!dateString) return '';
  
  // If it's already a number, return it as-is (already an Excel serial)
  if (typeof dateString === 'number') return dateString;
  
  // If it's not a string, return empty
  if (typeof dateString !== 'string') return '';
  
  try {
    // Parse dd/MM/yyyy format
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString; // Return original if not in expected format
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
    const year = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    // Excel's epoch is January 1, 1900, but Excel starts counting from 1 (not 0)
    // So January 1, 1900 = 1, January 2, 1900 = 2, etc.
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899 (one day before)
    
    // Calculate days difference
    const timeDiff = date.getTime() - excelEpoch.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // Excel incorrectly treats 1900 as a leap year
    // For dates after February 28, 1900, add 1 to account for the fake leap day
    if (date >= new Date(1900, 2, 1)) { // March 1, 1900 or later
      return daysDiff + 1;
    }
    
    return daysDiff;
  } catch (error) {
    console.error("Error converting date to Excel serial:", error);
    return dateString; // Return original string if conversion fails
  }
}
