/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office */

Office.onReady(() => {
  console.info("Office is ready");
});

function action(event) {
  Excel.run(async (context) => {
    console.info("Excel context");

    // Get the active worksheet
    const worksheet = context.workbook.worksheets.getActiveWorksheet();
    
    // Add some data
    const range = worksheet.getRange("A1");
    range.values = [["Hello from Action!"]];
    
    await context.sync();
    
    // Signal completion
    event.completed();
  });
}

// Register the function with Office.
Office.actions.associate("action", action);
