export const quoteTemplate = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Work Order Quote</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 2em;
    }

    .work-order-header {
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

    .work-order-items > thead {
      background-color: #ddd;
    }

    .work-order-items > tbody tr:nth-child(even) {
      background-color: #eee;
    }

    .work-order-items > tbody tr:nth-child(odd) {
      background-color: #fff;
    }
  </style>
</head>
<body>

<div class="work-order-header">
  <div id="left">
    <div>
      <h1>Company Name</h1>
      <p>Company Address</p>
      <p>Company Phone</p>
      <p>Company Email</p>
    </div>

    <table>
      <tr>
        <th colspan="2">Customer</th>
      </tr>
      <tr>
        <th>Name</th>
        <td>{{ customer.name }}</td>
      </tr>
      <tr>
        <th>Email</th>
        <td>{{ customer.email }}</td>
      </tr>
      <tr>
        <th>Phone</th>
        <td>{{ customer.phone }}</td>
      </tr>
      <tr>
        <th>Address</th>
        <td>{{ customer.address }}</td>
      </tr>
    </table>
  </div>

  <div id="right">
    <h2 style="text-align: right">Quote</h2>

    <table>
      <tr>
        <th>Date</th>
        <th>W.O. No.</th>
        <th>S.O. No.</th>
      </tr>
      <tr>
        <td>{{ date }}</td>
        <td>{{ name }}</td>
        <td>{{ shopifyOrderNames | join: ", " }}</td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Rep</th>
        <th>P.O. No.</th>
        <th>Project</th>
      </tr>
      <tr>
        <td>{{ customFields["Rep"] }}</td>
        <td>{{ purchaseOrderNames | join: ", " }}</td>
        <td>{{ customFields["Project"] }}</td>
      </tr>
    </table>
  </div>
</div>

<table class="work-order-items">
  <thead>
  <tr>
    <th>Item</th>
    <th>Description</th>
    <th>Quantity</th>
    <th>Cost</th>
    <th>Total</th>
  </tr>
  </thead>
  <tbody>

  {% for item in items %}
  <tr>
    <td>{{ item.name }}</td>
    <td>{{ item.description | truncate: 150 }}</td>
    <td>{{ item.quantity }}</td>
    <td>\${{ item.discountedUnitPrice }}</td>
    <td>\${{ item.discountedTotalPrice }}</td>
  </tr>
  {% for charge in item.charges %}
  <tr>
    <td>↳ {{ charge.name }}</td>
    <td>{{ charge.details }}</td>
    <td></td>
    <td></td>
    <td>\${{ charge.totalPrice }}</td>
  </tr>
  {% endfor %}
  {% endfor %}

  {% for charge in charges %}
  <tr>
    <td>{{ charge.name }}</td>
    <td>{{ charge.details }}</td>
    <td></td>
    <td></td>
    <td>\${{ charge.totalPrice }}</td>
  </tr>
  {% endfor %}

  <tr>
    <td>Tax</td>
    <td></td>
    <td></td>
    <td></td>
    <td>\${{ tax }}</td>
  </tr>

  <tr>
    <td colspan="3"></td>
    <td colspan="2">
      <span style="float: left"><strong>Total</strong></span>
      <span style="float: right">\${{ total }}</span>
    </td>
  </tr>
  </tbody>
</table>

<div style="margin: 1em auto; text-align: center; font-size: 8pt">
  We do our best to stock popular items, however when items are not in stock at our warehouse they need to be ordered and brought in from
  manufacturers or suppliers. In these instances the item is considered “Special Order” and may be subject to additional restocking fees if cancelled.

  Shipping is not refundable. Deposits taken on Special Order items are Non-Refundable.
</div>
</body>
</html>
`.trim();
