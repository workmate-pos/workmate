export const purchaseOrderInvoiceTemplate = `
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
      table-layout: fixed;
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #aaa;
      padding: 8px;
      text-align: center;
      word-wrap: break-word;
    }

    #left, #right {
      display: flex;
      flex-direction: column;
      gap: 0.75em;
      margin: 1em 0;
    }

    #left {
      margin-right: 0.5em;
    }

    #right {
      margin-left: 0.5em;
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
    <h2 style="text-align: right">Purchase Order Invoice</h2>

    <table>
      <tr>
        <th>Date</th>
        <th>Invoice #</th>
      </tr>
      <tr>
        <td>{{ date }}</td>
        <td>{{ customFields["Invoice #"] }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Ship To</th>
      </tr>
      <tr>
        <td>{{ shipTo | newline_to_br }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Rep</th>
        <th>P.O. No.</th>
      </tr>
      <tr>
        <td>{{ customFields["Rep"] }}</td>
        <td>{{ name }}</td>
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
    <td>{{ item.description | truncate: 150 }}</td>
    <td>{{ item.quantity }}</td>
  </tr>
  {% endfor %}
  </tbody>
</table>

<div style="width: 60%; border: 1px solid #aaa; margin: 1em 0; padding: 1em; font-size: 8pt; text-align: center">
  Buyer agrees to pay all collection costs including attorney's fees and a 1.5% interest
  (18% APR) on all past due amounts.
</div>

<table style="width: 20em; margin-top: 2em;">
  <tr>
    <th>Phone #</th>
    <td>{{ customFields["Phone #"] }}</td>
  </tr>
</table>
</body>
</html>
`.trim();
