export const invoiceTemplate = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Invoice for {{ name }}</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 2em;
    }

    .purchase-order-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #aaa;
      padding: 8px;
      text-align: center;
    }

    #left, #right {
      display: flex;
      flex-direction: column;
      width: 50%;
      gap: 2rem;
      margin: 1em 0;
      padding: 1em;
    }

    .purchase-order-items > thead {
      background-color: #ddd;
    }

    .purchase-order-items > tbody tr:nth-child(even) {
      background-color: #eee;
    }

    .purchase-order-items > tbody tr:nth-child(odd) {
      background-color: #fff;
    }
  </style>
</head>
<body>

<div class="purchase-order-header">
  <div id="left">
    <div>
      <h1>Company Name</h1>
      <p>Company Address</p>
      <p>Company Phone</p>
      <p>Company Email</p>
    </div>

    <table>
      <tr>
        <th>Bill To</th>
      </tr>
      <tr>
        <td>{{ customFields["Bill To"] }}</td>
      </tr>
    </table>
  </div>

  <div id="right">
    <div class="purchase-order-details">
      <h2 style="text-align: right">Invoice</h2>
      <table>
        <tr>
          <th>Date</th>
          <th>P.O. No.</th>
        </tr>
        <tr>
          <td>{{ date }}</td>
          <td>{{ name }}</td>
        </tr>
      </table>
    </div>

    <table>
      <tr>
        <th>Ship To</th>
      </tr>
      <tr>
        <td>{{ shipTo | newline_to_br }}</td>
      </tr>
    </table>
  </div>
</div>

<table class="purchase-order-items">
  <thead>
  <tr>
    <th>Item</th>
    <th>Description</th>
    <th>Quantity</th>
  </tr>
  </thead>
  <tbody>

  {% for item in lineItems %}
  <tr>
    <td>{{ item.name }}</td>
    <td>{{ item.description }}</td>
    <td>{{ item.quantity }}</td>
  </tr>
  {% endfor %}
  </tbody>
</table>

<table style="width: 20em; margin-top: 2em;">
  <tr>
    <th>Phone #</th>
    <td>{{ customFields["Phone #"] }}</td>
  </tr>
</table>
</body>
</html>

`.trim();