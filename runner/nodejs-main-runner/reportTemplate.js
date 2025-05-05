const reportTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Run Report - <%= jobId %></title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; cursor: pointer; }
    th:hover { background-color: #ddd; }
    pre { background-color: #f9f9f9; padding: 10px; overflow-x: auto; }
    .status-success { color: #22c55e; font-weight: bold; }
    .status-failed { color: #ef4444; font-weight: bold; }
    .preview-img { max-width: 100px; max-height: 100px; }
    #filterInput { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }
  </style>
  <script>
    function sortTable(n) {
      let table = document.getElementById("filesTable");
      let rows, switching = true;
      let i, shouldSwitch, dir = "asc";
      let switchcount = 0;
      while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
          shouldSwitch = false;
          let x = rows[i].getElementsByTagName("TD")[n];
          let y = rows[i + 1].getElementsByTagName("TD")[n];
          let xVal = x.innerHTML.toLowerCase();
          let yVal = y.innerHTML.toLowerCase();
          if (n === 2 || n === 1) { // Size or Timestamp column
            xVal = parseFloat(x.getAttribute('data-sort') || xVal);
            yVal = parseFloat(y.getAttribute('data-sort') || yVal);
          } else if (n === 0) { // Timestamp column
            xVal = new Date(x.getAttribute('data-sort') || xVal).getTime();
            yVal = new Date(y.getAttribute('data-sort') || yVal).getTime();
          }
          if (dir == "asc") {
            if (xVal > yVal) {
              shouldSwitch = true;
              break;
            }
          } else if (dir == "desc") {
            if (xVal < yVal) {
              shouldSwitch = true;
              break;
            }
          }
        }
        if (shouldSwitch) {
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
          switching = true;
          switchcount++;
        } else {
          if (switchcount == 0 && dir == "asc") {
            dir = "desc";
            switching = true;
          }
        }
      }
    }
    function filterTable() {
      let input = document.getElementById("filterInput").value.toLowerCase();
      let table = document.getElementById("filesTable");
      let rows = table.getElementsByTagName("TR");
      let regexPattern = input;
      
      // Convert wildcard patterns to regex
      if (input.includes('*')) {
        regexPattern = input.replace(/\*/g, '.*');
      } else if (input.startsWith('.') && !input.includes(' ')) {
        regexPattern = '.*' + input;
      }
      
      try {
        let regex = new RegExp(regexPattern, 'i');
        for (let i = 1; i < rows.length; i++) {
          let name = rows[i].getElementsByTagName("TD")[2].innerHTML.toLowerCase();
          if (regex.test(name)) {
            rows[i].style.display = "";
          } else {
            rows[i].style.display = "none";
          }
        }
      } catch (e) {
        // Fallback to substring search if regex is invalid
        for (let i = 1; i < rows.length; i++) {
          let name = rows[i].getElementsByTagName("TD")[2].innerHTML.toLowerCase();
          if (name.indexOf(input) > -1) {
            rows[i].style.display = "";
          } else {
            rows[i].style.display = "none";
          }
        }
      }
    }
    window.onload = function() {
      sortTable(0); // Sort by timestamp (oldest first) by default
    };
  </script>
</head>
<body>
  <h1>Job Run Report</h1>
  <table>
    <tr><th>Job Run ID</th><td><%= jobId %></td></tr>
    <tr><th>Config ID</th><td><%= configId %></td></tr>
    <tr><th>Runner ID</th><td><%= runnerId %></td></tr>
    <tr><th>Start Time</th><td><%= startTime %></td></tr>
    <tr><th>End Time</th><td><%= endTime %></td></tr>
    <tr><th>Duration (s)</th><td><%= duration %></td></tr>
    <tr><th>Status</th><td class="status-<%= status.toLowerCase() %>"><%= status %></td></tr>
    <tr><th>Scripts</th><td>
      <% scripts.forEach(function(script, index) { %>
        <strong>Script <%= index + 1 %>: <%= script.script_path %></strong><br>
        Parameters: <%= script.parameters || 'None' %><br>
        Iteration: <%= script.iteration || 'N/A' %><br>
        Stdout: <pre><%= script.stdout %></pre><br>
        Stderr: <pre><%= script.stderr %></pre><br>
      <% }); %>
    </td></tr>
    <tr><th>Environment Variables</th><td><%= envVars %></td></tr>
  </table>
  <h2>Associated Files</h2>
  <% if (associatedFiles && associatedFiles.length > 0) { %>
    <input type="text" id="filterInput" onkeyup="filterTable()" placeholder="Filter by filename or extension (use * for wildcard, e.g., *.png)">
    <table id="filesTable">
      <tr>
        <th onclick="sortTable(0)">Timestamp</th>
        <th onclick="sortTable(1)">Size</th>
        <th onclick="sortTable(2)">File Name</th>
        <th onclick="sortTable(3)">Link</th>
        <th>Preview</th>
      </tr>
      <% associatedFiles.forEach(function(file) { %>
        <tr>
          <td data-sort="<%= file.timestamp || 'N/A' %>"><%= file.timestamp || 'N/A' %></td>
          <td data-sort="<%= file.size %>">
            <% if (file.size >= 1024 * 1024) { %>
              <%= (file.size / (1024 * 1024)).toFixed(2) %> MB
            <% } else if (file.size >= 1024) { %>
              <%= (file.size / 1024).toFixed(2) %> KB
            <% } else { %>
              <%= file.size %> bytes
            <% } %>
          </td>
          <td><%= file.name %></td>
          <td><a href="<%= file.public_url || '#' %>" target="_blank">Link</a></td>
          <td>
            <% if (file.name && file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) { %>
              <img src="<%= file.public_url || '#' %>" alt="Preview of <%= file.name %>" class="preview-img" />
            <% } else { %>
              N/A
            <% } %>
          </td>
        </tr>
      <% }); %>
    </table>
  <% } else { %>
    <p>No associated files uploaded.</p>
  <% } %>
</body>
</html>
`;

module.exports = reportTemplate;
